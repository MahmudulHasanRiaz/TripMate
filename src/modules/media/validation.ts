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
 * (`<uuid>.png`). Keys are SERVER-generated from the validated mime — never
 * derived from a client filename — so they cannot smuggle path separators or
 * odd extensions into the storage path. Parsed at every boundary where a key
 * is trusted (the local driver also defends against traversal regardless).
 */
export const storageKeySchema = z
  .string()
  .regex(
    new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${EXT_PATTERN})$`),
    "Storage key must be a UUID with an allowed extension",
  );
export type StorageKey = z.infer<typeof storageKeySchema>;

/** Compose a validated storage key from an id + mime, or null if either is bad. */
export function buildStorageKey(uuid: string, mime: string): string | null {
  const ext = extensionForMime(mime);
  if (!ext) return null;
  const key = `${uuid}.${ext}`;
  return storageKeySchema.safeParse(key).success ? key : null;
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
