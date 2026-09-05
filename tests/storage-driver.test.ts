import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The drivers import "server-only" (they are server-side modules); stub the
// marker so the module imports cleanly under vitest's node env.
vi.mock("server-only", () => ({}));

import { getStorageDriver } from "@/modules/media/driver";

describe("local storage driver", () => {
  it("puts and deletes files, returns public url", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stor-"));
    process.env.STORAGE_LOCAL_DIR = dir;
    const driver = getStorageDriver("local");
    const { url } = await driver.put("a/b/test.txt", Buffer.from("hello"), "text/plain");
    expect(existsSync(join(dir, "a", "b", "test.txt"))).toBe(true);
    expect(readFileSync(join(dir, "a", "b", "test.txt"), "utf8")).toBe("hello");
    expect(url).toBe("/uploads/a/b/test.txt");
    await driver.delete("a/b/test.txt");
    expect(existsSync(join(dir, "a", "b", "test.txt"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_DIR;
  });

  it("rejects path traversal keys", async () => {
    const driver = getStorageDriver("local");
    await expect(driver.put("../evil.txt", Buffer.from("x"), "text/plain")).rejects.toThrow();
  });
});
