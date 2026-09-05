import { describe, expect, it } from "vitest";
import {
  ACCEPTED_MIME_LIST,
  MAX_UPLOAD_BYTES,
  MIME_EXTENSIONS,
  acceptFileMeta,
  buildStorageKey,
  extensionForMime,
  isAcceptedMime,
  storageKeySchema,
} from "@/modules/media/validation";

// Pure-unit suite for the media validation layer. No DB, no server-only imports
// — validation.ts is zod-only so it runs anywhere (tests, server actions, forms).

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("accepted mime whitelist", () => {
  it("whitelists the documented image + pdf types with their storage extensions", () => {
    expect(ACCEPTED_MIME_LIST).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
    ]);
    expect(MIME_EXTENSIONS["image/jpeg"]).toBe("jpg");
    expect(MIME_EXTENSIONS["image/png"]).toBe("png");
    expect(MIME_EXTENSIONS["image/webp"]).toBe("webp");
    expect(MIME_EXTENSIONS["image/svg+xml"]).toBe("svg");
    expect(MIME_EXTENSIONS["application/pdf"]).toBe("pdf");
  });

  it("recognizes accepted mimes and maps them to extensions", () => {
    for (const mime of ACCEPTED_MIME_LIST) {
      expect(isAcceptedMime(mime)).toBe(true);
      expect(extensionForMime(mime)).toBeTruthy();
    }
  });

  it("rejects anything outside the whitelist", () => {
    expect(isAcceptedMime("image/gif")).toBe(false);
    expect(isAcceptedMime("image/avif")).toBe(false);
    expect(isAcceptedMime("text/plain")).toBe(false);
    expect(isAcceptedMime("application/octet-stream")).toBe(false);
    expect(extensionForMime("image/gif")).toBeNull();
    expect(extensionForMime("")).toBeNull();
  });
});

describe("MAX_UPLOAD_BYTES", () => {
  it("is 25 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe("acceptFileMeta — { name, mime, size }", () => {
  const valid = { name: "beach.png", mime: "image/png", size: 4096 };

  it("accepts a well-formed meta object", () => {
    expect(acceptFileMeta.safeParse(valid).success).toBe(true);
  });

  it("accepts a file exactly at the 25 MB cap", () => {
    expect(
      acceptFileMeta.safeParse({
        name: "big.png",
        mime: "image/png",
        size: MAX_UPLOAD_BYTES,
      }).success,
    ).toBe(true);
  });

  it("rejects a mime outside the whitelist with a message naming the type", () => {
    const res = acceptFileMeta.safeParse({ ...valid, mime: "image/gif" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path[0]).toBe("mime");
      expect(res.error.issues[0].message).toMatch(/image\/gif/);
    }
  });

  it("rejects an empty mime", () => {
    const res = acceptFileMeta.safeParse({ ...valid, mime: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toMatch(/File type is missing/i);
    }
  });

  it("rejects a file above the 25 MB cap", () => {
    const res = acceptFileMeta.safeParse({
      ...valid,
      size: MAX_UPLOAD_BYTES + 1,
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path[0]).toBe("size");
      expect(res.error.issues[0].message).toMatch(/25 MB/);
    }
  });

  it("rejects a zero-byte file", () => {
    const res = acceptFileMeta.safeParse({ ...valid, size: 0 });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path[0]).toBe("size");
      expect(res.error.issues[0].message).toMatch(/empty/i);
    }
  });

  it("rejects a missing or blank display name", () => {
    const blank = acceptFileMeta.safeParse({ ...valid, name: "   " });
    expect(blank.success).toBe(false);
    const missing = acceptFileMeta.safeParse({ name: "", mime: "image/png", size: 1 });
    expect(missing.success).toBe(false);
  });

  it("rejects a non-integer / negative size", () => {
    expect(acceptFileMeta.safeParse({ ...valid, size: -5 }).success).toBe(false);
    expect(acceptFileMeta.safeParse({ ...valid, size: 1.5 }).success).toBe(false);
  });
});

describe("storage key shape (uuid + allowed extension)", () => {
  it("accepts a uuid with each allowed extension", () => {
    for (const ext of ["jpg", "png", "webp", "svg", "pdf"]) {
      expect(storageKeySchema.safeParse(`${UUID}.${ext}`).success).toBe(true);
    }
  });

  it("rejects a non-uuid stem, a disallowed extension, and a missing dot", () => {
    expect(storageKeySchema.safeParse("not-a-uuid.png").success).toBe(false);
    expect(storageKeySchema.safeParse(`${UUID}.gif`).success).toBe(false);
    expect(storageKeySchema.safeParse(`${UUID}png`).success).toBe(false);
    expect(storageKeySchema.safeParse(`${UUID}.png.txt`).success).toBe(false);
  });

  it("builds a storage key from a uuid + accepted mime", () => {
    expect(buildStorageKey(UUID, "image/png")).toBe(`${UUID}.png`);
    expect(buildStorageKey(UUID, "image/svg+xml")).toBe(`${UUID}.svg`);
    expect(buildStorageKey(UUID, "application/pdf")).toBe(`${UUID}.pdf`);
  });

  it("returns null for a disallowed mime or a malformed uuid", () => {
    expect(buildStorageKey(UUID, "image/gif")).toBeNull();
    expect(buildStorageKey("nope", "image/png")).toBeNull();
  });
});
