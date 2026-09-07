import "server-only";
import { resolve } from "node:path";

/**
 * Shared path logic for the local storage driver and the /uploads serving
 * route (src/app/uploads/[...path]/route.ts) — ONE traversal-safe resolver so
 * the route can never resolve outside the directory the driver writes to.
 *
 * The local driver's DEFAULT root is `storage/uploads` (OUTSIDE public/) so
 * uploaded files are served exclusively through the hardened route handler
 * (SVG gets a sandboxing CSP; see that route). Files uploaded before this
 * default change live under public/uploads and keep serving statically from
 * there — Next maps public/* to the same /uploads/<key> URL.
 */

/** Absolute path of the local driver's storage root. */
export function localUploadsRoot(): string {
  return resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "storage/uploads");
}

/** Absolute path of the PRE-storage-root-change root (public/uploads). Legacy
 *  objects live there; the serving route and the driver's delete fall back to
 *  it so old files keep resolving and empty-trash can reclaim them. */
export function legacyUploadsRoot(): string {
  return resolve(process.cwd(), "public/uploads");
}

/**
 * Resolve a storage key under `root`, rejecting traversal. Returns the
 * absolute path, or null when the key is empty / escapes the root. The
 * separator check covers both platforms: `resolve` emits the OS separator,
 * but a hand-built root (env var with forward slashes on Windows) can leave a
 * mixed-separator prefix, so both are checked — identical to the check the
 * local driver has always applied.
 */
export function resolveUnderRoot(root: string, key: string): string | null {
  const full = resolve(root, key);
  if (!full.startsWith(root + "\\") && !full.startsWith(root + "/")) {
    return null;
  }
  return full;
}
