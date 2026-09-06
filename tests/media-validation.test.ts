import { describe, expect, it } from "vitest";
import {
  ACCEPTED_MIME_LIST,
  MAX_UPLOAD_BYTES,
  MIME_EXTENSIONS,
  USER_DOC_ACCEPTED_MIME_LIST,
  USER_DOC_MAX_UPLOAD_BYTES,
  acceptFileMeta,
  acceptUserDocFileMeta,
  buildStorageKey,
  extensionForMime,
  isAcceptedMime,
  isAcceptedUserDocMime,
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

describe("user-document whitelist (portal uploads)", () => {
  it("is the stricter subset of the library whitelist — no SVG", () => {
    expect(USER_DOC_ACCEPTED_MIME_LIST).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]);
    for (const mime of USER_DOC_ACCEPTED_MIME_LIST) {
      expect(isAcceptedUserDocMime(mime)).toBe(true);
      // Every accepted user-doc mime also resolves to a storage extension.
      expect(extensionForMime(mime)).toBeTruthy();
    }
  });

  it("rejects the library-only types and everything else", () => {
    expect(isAcceptedUserDocMime("image/svg+xml")).toBe(false);
    expect(isAcceptedUserDocMime("image/gif")).toBe(false);
    expect(isAcceptedUserDocMime("text/plain")).toBe(false);
    expect(isAcceptedUserDocMime("")).toBe(false);
  });

  it("caps user documents at 10 MB, not the library's 25 MB", () => {
    expect(USER_DOC_MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
    expect(USER_DOC_MAX_UPLOAD_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
  });
});

describe("acceptUserDocFileMeta — { name, mime, size }", () => {
  const valid = { name: "payment-proof.png", mime: "image/png", size: 2048 };

  it("accepts each whitelisted type at a normal size", () => {
    for (const mime of USER_DOC_ACCEPTED_MIME_LIST) {
      expect(acceptUserDocFileMeta.safeParse({ ...valid, mime }).success).toBe(true);
    }
  });

  it("rejects SVG and other non-whitelisted types with a message naming the type", () => {
    const res = acceptUserDocFileMeta.safeParse({ ...valid, mime: "image/svg+xml" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path[0]).toBe("mime");
      expect(res.error.issues[0].message).toMatch(/image\/svg\+xml/);
    }
    expect(acceptUserDocFileMeta.safeParse({ ...valid, mime: "application/zip" }).success).toBe(false);
  });

  it("accepts a file exactly at the 10 MB cap and rejects one byte over", () => {
    expect(
      acceptUserDocFileMeta.safeParse({
        ...valid,
        size: USER_DOC_MAX_UPLOAD_BYTES,
      }).success,
    ).toBe(true);
    const over = acceptUserDocFileMeta.safeParse({
      ...valid,
      size: USER_DOC_MAX_UPLOAD_BYTES + 1,
    });
    expect(over.success).toBe(false);
    if (!over.success) {
      expect(over.error.issues[0].path[0]).toBe("size");
      expect(over.error.issues[0].message).toMatch(/10 MB/);
    }
  });

  it("rejects an empty file, a blank name and a non-integer size", () => {
    expect(acceptUserDocFileMeta.safeParse({ ...valid, size: 0 }).success).toBe(false);
    expect(acceptUserDocFileMeta.safeParse({ ...valid, size: -1 }).success).toBe(false);
    expect(acceptUserDocFileMeta.safeParse({ ...valid, size: 1.5 }).success).toBe(false);
    expect(acceptUserDocFileMeta.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });
});
