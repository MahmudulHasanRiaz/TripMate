import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StorageDriver } from "../driver-types";

/**
 * Filesystem-backed storage driver (the dev / self-hosted default).
 *
 * With the DEFAULT root (`public/uploads`) the stored files land under Next's
 * public dir and are served statically by `next dev` / `next start` at the
 * returned `/uploads/<key>` URL, so no extra serving route is needed.
 *
 * NOTE: overriding STORAGE_LOCAL_DIR to a directory OUTSIDE `public/` requires
 * a dedicated serving route (streaming files from disk under a URL prefix).
 * That is deliberately deferred to Plan 7 polish — the default keeps uploads
 * static-served today.
 */
export class LocalDriver implements StorageDriver {
  private root() {
    return resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "public/uploads");
  }

  private safe(key: string) {
    const full = resolve(this.root(), key);
    if (!full.startsWith(this.root() + "\\") && !full.startsWith(this.root() + "/")) {
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
    await unlink(this.safe(key));
  }

  async testConnection() {
    return { ok: true };
  }
}
