import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { legacyUploadsRoot, localUploadsRoot, resolveUnderRoot } from "../paths";
import type { StorageDriver } from "../driver-types";

/**
 * Filesystem-backed storage driver (the dev / self-hosted default).
 *
 * The DEFAULT root is `storage/uploads` — deliberately OUTSIDE `public/` so
 * uploaded objects are served only through the hardened route handler at
 * src/app/uploads/[...path]/route.ts (SVG CSP sandbox + nosniff + immutable
 * cache), never as same-origin-executable static files.
 *
 * COMPAT: files uploaded before this default change live under `public/uploads`
 * and keep serving statically from there — Next maps `public/*` onto the same
 * `/uploads/<key>` URL, so old links keep working. Setting STORAGE_LOCAL_DIR
 * back to `public/uploads` restores the old static-serve behavior (at the cost
 * of the SVG hardening).
 */
export class LocalDriver implements StorageDriver {
  private root() {
    return localUploadsRoot();
  }

  private safe(key: string) {
    const full = resolveUnderRoot(this.root(), key);
    if (!full) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, data: Buffer, contentType: string) {
    void contentType;
    const full = this.safe(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return { url: `/uploads/${key.split("\\").join("/")}` };
  }

  async delete(key: string) {
    // The object normally lives under the configured root. Objects uploaded
    // BEFORE the storage-root change live under the legacy public/uploads root
    // (see the class docstring) — when the configured root doesn't hold the
    // object, fall back to the legacy root (same fallback the /uploads serving
    // route applies) so empty-trash reclaims pre-change rows instead of
    // failing them on ENOENT forever.
    try {
      await unlink(this.safe(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const legacy = resolveUnderRoot(legacyUploadsRoot(), key);
      if (!legacy) throw e;
      await unlink(legacy); // missing there too → throws → caller keeps the row
    }
  }

  async testConnection() {
    return { ok: true };
  }
}
