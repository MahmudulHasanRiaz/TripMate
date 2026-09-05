import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StorageDriver } from "../driver-types";

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
