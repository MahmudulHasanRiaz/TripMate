import "server-only";
import { randomUUID } from "node:crypto";
import { buildStorageKey } from "@/modules/media/validation";
import { getStorageDriver } from "@/modules/media/driver";
import { getSetting } from "@/modules/settings/service";

/**
 * Shared storage-object writer for every media upload path (the admin library
 * action and the user-document service). Extracted from the admin uploadFile
 * action in Plan 5 T3 so both paths read the storage setting, dispatch the
 * driver and generate the storage key in exactly one place.
 *
 * The storage KEY is server-generated from the validated mime
 * (`<uuid>.<ext>`) — never derived from a client filename — and re-checked
 * against the key shape before it reaches the driver. Driver failures
 * propagate raw; each caller decides how to relay them (the admin action
 * converts them to { code: "STORAGE" }, the user-doc service wraps them in a
 * typed UserDocError).
 */

export type StoredObject = {
  disk: "local" | "r2";
  /** The storage key — also the media_files.path column value. */
  path: string;
  url: string;
};

/** Store a buffer through the configured driver under a fresh server-generated
 *  key. Returns the row-ready storage fields. */
export async function putFileObject(
  mime: string,
  buffer: Buffer,
): Promise<StoredObject> {
  const disk = (await getSetting("storage"))?.driver === "r2" ? "r2" : "local";
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
