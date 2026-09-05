"use server";

/**
 * Media library mutations — the admin write surface for uploaded files.
 *
 * `uploadFile` accepts a multipart FormData payload from the MediaUploader
 * dropzone/input. It VALIDATES the file meta (mime whitelist + 25MB cap) before
 * buffering a single byte, stores the object through whichever storage driver
 * the storage setting selects (local or R2), then records the row in
 * media_files. The storage KEY is server-generated from the validated mime
 * (`<uuid>.<ext>`) — never derived from the client filename — and re-checked
 * against the key shape before it reaches the driver.
 *
 * Every action runs through `mediaAction` (withGuard media.manage + typed error
 * relay — see action-utils.ts). Upload is additionally rate-limited 20/min per
 * client. The next.config bodySizeLimit is raised to 25mb so multipart bodies
 * near the cap actually arrive; this action still enforces the real limit.
 */

import { randomUUID } from "node:crypto";
import {
  acceptFileMeta,
  buildStorageKey,
} from "@/modules/media/validation";
import { getStorageDriver } from "@/modules/media/driver";
import { getSetting } from "@/modules/settings/service";
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

    const disk = (await getSetting("storage"))?.driver === "r2" ? "r2" : "local";
    const driver = getStorageDriver(disk);
    const key = buildStorageKey(randomUUID(), meta.mime);
    if (!key) {
      return {
        ok: false,
        code: "VALIDATION",
        error: `Unsupported file type "${meta.mime}".`,
      };
    }

    let url: string;
    try {
      const stored = await driver.put(key, buffer, meta.mime);
      url = stored.url;
    } catch (e) {
      return {
        ok: false,
        code: "STORAGE",
        error: e instanceof Error ? e.message : "Storage upload failed.",
      };
    }

    const saved = await insertMediaFile({
      name: meta.name,
      disk,
      path: key,
      url,
      mime: meta.mime,
      size: meta.size,
    });
    return { ok: true, data: { id: saved.id, url: saved.url, name: saved.name } };
  },
);

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
