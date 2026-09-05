import { test, expect, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";

// =============================================================================
// Media admin e2e — full upload round-trip against the shared dev DB.
//
// Flow:
//   1. sign in as the superadmin
//   2. generate a REAL PNG > 1MB in-memory (no fixture file on disk) and upload
//      it through the dropzone's file input — proving the server-action
//      bodySizeLimit lift: a stock 1MB Next cap would reject this multipart
//      body before the action ran, so a card appearing is the proof
//   3. see the file card in the grid
//   4. edit its alt text inline
//   5. trash it → gone from the grid (the stored object is kept)
//
// Idempotency: the file name is unique per run (Date.now()), so residue from a
// crashed run never collides; every run trashes its own upload.
// Sorted after catalog-admin.spec.ts (alphabetical), so the superadmin exists
// when this runs in a full suite; standalone it needs an already-set-up DB.
// =============================================================================
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";

test.setTimeout(90_000); // cold Turbopack compiles /login + the whole media section
const wait = { timeout: 25_000 };

// ---- minimal PNG encoder (RGB8, no interlace) ---------------------------------
// The fixture is built at runtime with node zlib, so no binary is committed and
// the bytes are deterministic per width/height. Random (incompressible) pixels
// keep the IDAT above 1MB for a 1600x240 canvas.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makeLargeRgbPng(width: number, height: number): Buffer {
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(height * rowBytes);
  let seed = 0x2f6e2b1 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    if (i % rowBytes === 0) continue; // leading filter byte stays 0
    seed = (seed * 1664525 + 1013904223) >>> 0;
    raw[i] = (seed >>> 24) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(async () => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await expect(page.getByLabel(/email/i)).toHaveValue(ADMIN_EMAIL, { timeout: 1_000 });
    await expect(page.getByLabel(/password/i)).toHaveValue(ADMIN_PASSWORD, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, wait);
}

test("media upload round-trip: >1MB PNG, alt edit, trash", async ({ page }) => {
  await signInAsAdmin(page);

  // Build the >1MB fixture first so the assertion holds even if the upload later
  // regresses to the stock 1MB body cap.
  const png = makeLargeRgbPng(1600, 240);
  expect(png.byteLength, "fixture must exceed 1MB to prove the body-limit lift").toBeGreaterThan(1024 * 1024);
  const fileName = `e2e-large-${Date.now()}.png`;

  await test.step("open the media library", async () => {
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible(wait);
  });

  await test.step("upload a >1MB PNG through the dropzone input", async () => {
    await page.setInputFiles("#media-file-input", {
      name: fileName,
      mimeType: "image/png",
      buffer: png,
    });
    // The uploader posts to the server action, then refreshes the grid.
    await expect(page.getByText(fileName, { exact: true }).first()).toBeVisible(wait);
  });

  await test.step("edit the alt text inline", async () => {
    const card = page.locator("li", { hasText: fileName }).first();
    await card.getByRole("button", { name: `Edit alt for ${fileName}` }).click();
    await page.getByLabel("Alt text").fill("A large test image");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("A large test image", { exact: true })).toBeVisible(wait);
  });

  await test.step("trash the file — gone from the grid", async () => {
    await page.getByRole("button", { name: `Trash ${fileName}` }).click();
    await page.getByRole("button", { name: "Trash file" }).click();
    await expect(page.getByText(fileName, { exact: true })).toHaveCount(0, wait);
  });
});
