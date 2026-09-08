import "server-only";
import { randomUUID } from "node:crypto";
import { buildStorageKey } from "@/modules/media/validation";
import { getStorageDriver } from "@/modules/media/driver";
import { getSetting } from "@/modules/settings/service";

/**
 * Shared storage-object writer/ deleter for every media path (the admin
 * library action, the user-document service, and the empty-trash pass).
 * Extracted from the admin uploadFile action in Plan 5 T3 so every path reads
 * the storage setting, dispatches the driver and generates the storage key in
 * exactly one place.
 *
 * The storage KEY is server-generated from the validated mime
 * (`<uuid>.<ext>`) — never derived from a client filename — and re-checked
 * against the key shape before it reaches the driver. Driver failures
 * propagate raw; each caller decides how to relay them (the admin action
 * converts them to { code: "STORAGE" }, the user-doc service wraps them in a
 * typed UserDocError, the trash pass keeps the row and counts it failed).
 *
 * The path helpers (localUploadsRoot / resolveUnderRoot) are re-exported for
 * the /uploads serving route, which must resolve request paths with the SAME
 * traversal-safe logic the local driver uses. They live in paths.ts (not
 * here) to avoid a storage → driver → local → storage import cycle.
 */

export { localUploadsRoot, legacyUploadsRoot, resolveUnderRoot } from "./paths";

export type StoredObject = {
  disk: "local" | "r2";
  /** The storage key — also the media_files.path column value. */
  path: string;
  url: string;
};

/** Store a buffer through the configured driver under a fresh server-generated
 *  key. Returns the row-ready storage fields. */
/** Resolve the storage disk for NEW objects: the wizard-stored settings row
 *  wins when present; otherwise fall back to the STORAGE_DRIVER env (so demo
 *  seeding and uploads work before/without a settings row — e.g. wizard Mode
 *  step seeds assets before the Storage step, and the admin reset deletes the
 *  settings row before re-seeding). Defaults to local. */
async function resolveStorageDisk(): Promise<"local" | "r2"> {
  const configured = (await getSetting("storage"))?.driver;
  if (configured === "r2" || configured === "local") return configured;
  const env = process.env.STORAGE_DRIVER;
  if (env === "r2" || env === "local") return env;
  return "local";
}

export async function putFileObject(
  mime: string,
  buffer: Buffer,
): Promise<StoredObject> {
  const disk = await resolveStorageDisk();
  const driver = getStorageDriver(disk);
  const key = buildStorageKey(randomUUID(), mime);
  if (!key) {
    // Only reachable with a mime the whitelist refuses (callers validate meta
    // first) — defended here anyway so the invariant holds at the source.
    throw new Error(`Unsupported file type "${mime}".`);
  }
  const stored = await driver.put(key, buffer, mime);
  return { disk, path: key, url: stored.url };
}

/**
 * Delete a stored object through the driver that OWNS it. Unlike
 * putFileObject (which dispatches on the LIVE storage setting — a new object
 * goes wherever storage is configured NOW), deletion dispatches on the disk
 * the media row recorded at upload time: the setting may have switched
 * since, and the object still sits where it was written. Dispatching on the
 * setting here would hard-delete the row while leaving the real object
 * orphaned on disk (or count a still-reachable object as a failed delete).
 * Driver failures propagate; the caller decides (the trash pass keeps the
 * row and reports the count).
 */
export async function deleteFileObject(
  disk: "local" | "r2",
  path: string,
): Promise<void> {
  const driver = getStorageDriver(disk);
  await driver.delete(path);
}
