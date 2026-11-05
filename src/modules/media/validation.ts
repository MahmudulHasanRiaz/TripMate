import { z } from "zod";

// Validation rules for the media module. Pure (no DB / no server-only) so it
// can be imported from tests, server actions and client components alike.
//
// The library accepts a deliberately small whitelist — raster images (for
// next/image thumbnails + the public templates), SVG and PDF (rich assets
// admins attach to listings/docs). Everything else is refused at the action
// boundary with a type-naming error before a single byte is buffered.
//
// File sizes are validated from the multipart meta (name/mime/size) BEFORE the
// body is read into memory, so a >cap file never lands in the buffer. The
// server-action bodySizeLimit (next.config experimental.serverActions) is
// itself raised to 25mb so the request arrives at all — these two limits are
// complementary, not redundant.

/** Accepted mime -> storage-file extension. Single source for whitelist + keys. */
export const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
} as const;

export type AcceptedMime = keyof typeof MIME_EXTENSIONS;

export const ACCEPTED_MIME_LIST = Object.keys(MIME_EXTENSIONS) as AcceptedMime[];

/** Hard per-file cap, in bytes. Keep in sync with the 25mb bodySizeLimit. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isAcceptedMime(mime: string): mime is AcceptedMime {
  return mime in MIME_EXTENSIONS;
}

/** The storage extension for an accepted mime, or null when not accepted. */
export function extensionForMime(mime: string): string | null {
  return isAcceptedMime(mime) ? MIME_EXTENSIONS[mime] : null;
}

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

const EXT_PATTERN = Object.values(MIME_EXTENSIONS).join("|");

/**
 * A storage key is a lowercase uuid stem plus a whitelisted extension
 * (`<uuid>.png`). Keys are SERVER-generated — uploads from a UUID + the
 * validated mime, renames from a server-slugified stem (see slugifyFileStem)
 * — never taken raw from a client filename, so they cannot smuggle path
 * separators or odd extensions into the storage path. Parsed at every
 * boundary where a key is trusted (the local driver also defends against
 * traversal regardless).
 */
const UUID_STEM = `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`;
const SLUG_STEM = `[a-z0-9]+(?:-[a-z0-9]+)*`;
export const storageKeySchema = z
  .string()
  .regex(
    new RegExp(`^(?:${UUID_STEM}|${SLUG_STEM})\\.(${EXT_PATTERN})$`),
    "Storage key must be a UUID or slug with an allowed extension",
  );
export type StorageKey = z.infer<typeof storageKeySchema>;

/** Compose a validated storage key from an id + mime, or null if either is bad. */
export function buildStorageKey(uuid: string, mime: string): string | null {
  const ext = extensionForMime(mime);
  if (!ext) return null;
  const key = `${uuid}.${ext}`;
  return storageKeySchema.safeParse(key).success ? key : null;
}

/** Longest stem a rename may produce (keeps URLs and filesystems sane). */
export const MAX_SLUG_STEM_LENGTH = 80;

/**
 * Turn a user-typed file name into an SEO-friendly URL stem: lowercase ASCII,
 * diacritics stripped (café → cafe), every run of non [a-z0-9] characters
 * collapsed to one hyphen, hyphens trimmed, capped at MAX_SLUG_STEM_LENGTH.
 * Returns "" when nothing ASCII-usable remains (e.g. a purely Bengali name) —
 * the caller must refuse the rename with guidance, never invent a stem.
 */
export function slugifyFileStem(input: string): string {
  const slug = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, MAX_SLUG_STEM_LENGTH).replace(/-+$/g, "");
}

/** Compose a validated slug storage key from a slugified stem + mime. */
export function buildSlugStorageKey(stem: string, mime: string): string | null {
  const ext = extensionForMime(mime);
  if (!ext) return null;
  const key = `${stem}.${ext}`;
  return storageKeySchema.safeParse(key).success ? key : null;
}

/**
 * Pick the first free key for a rename: `<stem>.<ext>`, then `<stem>-2.<ext>`,
 * `<stem>-3.<ext>`… against the set of keys already taken by OTHER files.
 * Pure so the collision rule is unit-testable without storage or a DB.
 */
export function planRenamedKey(stem: string, ext: string, taken: ReadonlySet<string>): string {
  const base = `${stem}.${ext}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${stem}-${n}.${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Accepts the multipart meta of an uploaded file. Errors are zod issues on the
 * offending field so the action can surface a precise message ("File type
 * \"image/gif\" is not accepted…", "File exceeds the 25 MB upload limit.").
 */
export const acceptFileMeta = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "File name is required")
      .max(255, "File name must be 255 characters or fewer"),
    mime: z.string().trim().min(1, "File type is missing"),
    size: z.number().int("Invalid file size").nonnegative("Invalid file size"),
  })
  .superRefine((meta, ctx) => {
    if (!isAcceptedMime(meta.mime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mime"],
        message: `File type "${meta.mime}" is not accepted. Allowed: JPEG, PNG, WebP, SVG, PDF.`,
      });
    }
    if (!Number.isInteger(meta.size) || meta.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["size"],
        message: "File is empty.",
      });
    } else if (meta.size > MAX_UPLOAD_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["size"],
        message: "File exceeds the 25 MB upload limit.",
      });
    }
  });
export type FileMeta = z.infer<typeof acceptFileMeta>;

// ---- user documents (portal uploads — Plan 5 T3) --------------------------------
//
// The customer-portal upload path accepts a deliberately STRICTER subset of
// the admin library whitelist: no SVG (attacker-authored script vector when
// rendered inline — admins may consciously upload it, customers may not) and
// a 10MB cap instead of 25MB. Sizes are validated from the multipart meta
// BEFORE the body is read into memory, exactly like the admin path.

/** Accepted user-document mimes (a subset of MIME_EXTENSIONS — the extension
 *  lookup reuses the admin map, which carries identical extensions). */
export const USER_DOC_ACCEPTED_MIME_LIST = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const satisfies readonly (keyof typeof MIME_EXTENSIONS)[];

export type UserDocMime = (typeof USER_DOC_ACCEPTED_MIME_LIST)[number];

export function isAcceptedUserDocMime(mime: string): mime is UserDocMime {
  return (USER_DOC_ACCEPTED_MIME_LIST as readonly string[]).includes(mime);
}

/** Hard per-file cap for user documents, in bytes (10MB — NOT the library's
 *  25MB; the next.config bodySizeLimit accommodates both). */
export const USER_DOC_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The multipart meta of a user-document upload. Errors are zod issues on the
 *  offending field (same shape as acceptFileMeta) so the action can surface a
 *  precise "File exceeds the 10 MB upload limit."-style message. */
export const acceptUserDocFileMeta = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "File name is required")
      .max(255, "File name must be 255 characters or fewer"),
    mime: z.string().trim().min(1, "File type is missing"),
    size: z.number().int("Invalid file size").nonnegative("Invalid file size"),
  })
  .superRefine((meta, ctx) => {
    if (!isAcceptedUserDocMime(meta.mime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mime"],
        message: `File type "${meta.mime}" is not accepted. Allowed: JPEG, PNG, WebP, PDF.`,
      });
    }
    if (!Number.isInteger(meta.size) || meta.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["size"],
        message: "File is empty.",
      });
    } else if (meta.size > USER_DOC_MAX_UPLOAD_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["size"],
        message: "File exceeds the 10 MB upload limit.",
      });
    }
  });
export type UserDocFileMeta = z.infer<typeof acceptUserDocFileMeta>;

/** Human-readable byte size for grid captions ("1.2 MB"). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = "B";
  for (const u of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = u;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}
