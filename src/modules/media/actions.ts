"use server";

/**
 * Media library mutations — the admin write surface for uploaded files.
 *
 * `uploadFile` accepts a multipart FormData payload from the MediaUploader
 * dropzone/input. It VALIDATES the file meta (mime whitelist + 25MB cap) before
 * buffering a single byte, stores the object through whichever storage driver
 * the storage setting selects (local or R2 — via the shared putFileObject
 * helper in storage.ts, also used by the user-document path), then records the
 * row in media_files. The storage KEY is server-generated from the validated
 * mime (`<uuid>.<ext>`) — never derived from the client filename — and
 * re-checked against the key shape before it reaches the driver.
 *
 * Every admin action runs through `mediaAction` (withGuard media.manage + typed
 * error relay — see action-utils.ts). Upload is additionally rate-limited 20/min
 * per client. The next.config bodySizeLimit is raised to 25mb so multipart bodies
 * near the cap actually arrive; this action still enforces the real limit.
 *
 * `uploadMyDocumentAction` (Plan 5 T3) is the customer-portal counterpart: a
 * SESSION-required (not permission-gated) upload under the stricter
 * user-document rules (JPEG/PNG/WebP/PDF only, 10MB cap), owner-scoped to the
 * session user's media rows. It relays { ok, url } | { ok:false, code, error }.
 * The portal's READ side (listUserDocuments) is deliberately NOT an action:
 * portal server components import it from user-docs.ts (server-only) and carry
 * their own route-level ownership — re-exporting an async service fn from this
 * 'use server' file would expose it as an unguarded client-callable endpoint.
 */

import {
  acceptFileMeta,
  acceptUserDocFileMeta,
} from "@/modules/media/validation";
import { putFileObject } from "@/modules/media/storage";
import { uploadUserDocument, UserDocError } from "@/modules/media/user-docs";
import {
  getFileById,
  insertMediaFile,
  softDeleteMediaFile,
  updateMediaFileAlt,
} from "@/modules/media/service";
import {
  mediaAction,
  parseMediaId,
  type MediaActionResult,
} from "@/modules/media/action-utils";
import { withGuard, GuardError } from "@/lib/guard";

const UPLOAD_RATE_LIMIT = { limit: 20, windowMs: 60_000 }; // 20 uploads/min

export type UploadResult = { id: string; url: string; name: string };

/**
 * Upload one file (multipart). FormData field: "file" — a File whose meta is
 * validated against the whitelist + cap before the body is buffered. Returns
 * the new library row so the uploader can refresh the grid around it.
 */
export const uploadFile = mediaAction<FormData, MediaActionResult<UploadResult>>(
  { rateLimit: UPLOAD_RATE_LIMIT },
  async (formData) => {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, code: "VALIDATION", error: "No file was attached." };
    }

    const parsed = acceptFileMeta.safeParse({
      name: file.name,
      mime: file.type || "",
      size: file.size,
    });
    if (!parsed.success) {
      // Relay the first issue as a precise, field-scoped message.
      const issue = parsed.error.issues[0];
      const field = issue.path.join(".");
      return {
        ok: false,
        code: "VALIDATION",
        error: field ? `${field}: ${issue.message}` : issue.message,
      };
    }
    const meta = parsed.data;

    // Meta passed the cap check — only now read the body into memory.
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength !== meta.size) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "File changed while uploading — please try again.",
      };
    }

    let stored;
    try {
      stored = await putFileObject(meta.mime, buffer);
    } catch (e) {
      return {
        ok: false,
        code: "STORAGE",
        error: e instanceof Error ? e.message : "Storage upload failed.",
      };
    }

    const saved = await insertMediaFile({
      name: meta.name,
      disk: stored.disk,
      path: stored.path,
      url: stored.url,
      mime: meta.mime,
      size: meta.size,
    });
    return { ok: true, data: { id: saved.id, url: saved.url, name: saved.name } };
  },
);

export type UploadMyDocumentResult =
  | { ok: true; url: string }
  | { ok: false; code?: string; error: string };

/**
 * The portal's own-document upload (multipart, FormData field "file"). Guarded
 * by withGuard({}) — a SESSION is required, no admin permission — and
 * rate-limited 20/min per client. The file meta is validated against the
 * user-document rules (JPEG/PNG/WebP/PDF, 10MB) BEFORE the body is buffered;
 * the owner is always the session user (never client input). Relays
 * { ok, url } on success.
 */
export async function uploadMyDocumentAction(
  formData: FormData,
): Promise<UploadMyDocumentResult> {
  const run = withGuard(
    { rateLimit: UPLOAD_RATE_LIMIT },
    async (fd: FormData, session) => {
      if (!session) return { ok: false as const, error: "UNAUTHORIZED" };

      const file = fd.get("file");
      if (!(file instanceof File)) {
        return { ok: false as const, code: "VALIDATION", error: "No file was attached." };
      }

      const parsed = acceptUserDocFileMeta.safeParse({
        name: file.name,
        mime: file.type || "",
        size: file.size,
      });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.join(".");
        return {
          ok: false as const,
          code: "VALIDATION",
          error: field ? `${field}: ${issue.message}` : issue.message,
        };
      }
      const meta = parsed.data;

      // Meta passed the cap check — only now read the body into memory.
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.byteLength !== meta.size) {
        return {
          ok: false as const,
          code: "VALIDATION",
          error: "File changed while uploading — please try again.",
        };
      }

      try {
        const saved = await uploadUserDocument({
          ownerUserId: session.user.id,
          name: meta.name,
          mime: meta.mime,
          size: meta.size,
          buffer,
        });
        return { ok: true as const, url: saved.url };
      } catch (e) {
        if (e instanceof UserDocError) {
          return { ok: false as const, code: e.code, error: e.message };
        }
        throw e;
      }
    },
  );

  try {
    return await run(formData);
  } catch (e) {
    if (e instanceof GuardError) {
      return { ok: false, error: e.code };
    }
    throw e;
  }
}

const ALT_MAX = 200;

/** Edit alt text on a file (inline on the library card). */
export const updateFileAlt = mediaAction<
  { id: string; alt: string },
  MediaActionResult
>({}, async ({ id, alt }) => {
  const parsedId = parseMediaId(id);
  if (!parsedId) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const text = typeof alt === "string" ? alt : "";
  if (text.length > ALT_MAX) {
    return {
      ok: false,
      code: "VALIDATION",
      error: `Alt text must be ${ALT_MAX} characters or fewer.`,
    };
  }
  await updateMediaFileAlt(parsedId, text);
  return { ok: true };
});

/**
 * Trash a file: soft-delete the row so it leaves the library grid. The stored
 * OBJECT is deliberately kept — hard deletion is reserved for a future
 * "empty trash" pass, so a mistaken trash can still be restored or re-linked.
 */
export const trashFile = mediaAction<{ id: string }, MediaActionResult>(
  {},
  async ({ id }) => {
    const parsedId = parseMediaId(id);
    if (!parsedId) return { ok: false, code: "VALIDATION", error: "Invalid id" };
    const before = await getFileById(parsedId);
    if (!before) {
      return { ok: false, code: "NOT_FOUND", error: "File not found or already deleted." };
    }
    const ok = await softDeleteMediaFile(parsedId);
    if (!ok) {
      return { ok: false, code: "NOT_FOUND", error: "File not found or already deleted." };
    }
    return { ok: true };
  },
);
