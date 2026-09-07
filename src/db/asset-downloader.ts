import "server-only";
import { db } from "@/db/client";
import { mediaFiles } from "@/modules/media/schema";
import { putFileObject } from "@/modules/media/storage";
import { eq, and, isNull } from "drizzle-orm";

export type SeedAsset = {
  name: string;
  sourceUrl: string;
  mime: string;
  alt: string;
  fallbackSvg: string;
};

/**
 * Downloads a curated copyright-safe demo asset from a remote URL or generates
 * the vector SVG fallback if offline, stores it in the application's configured
 * storage driver (Local storage or Cloudflare R2), and inserts a record in
 * media_files.
 *
 * HARD REQUIREMENT:
 * The public website NEVER accesses third-party image domains directly.
 * All demo assets are stored in the application's own storage and served
 * through local /uploads or R2 URLs.
 */
export async function downloadAndStoreDemoAsset(asset: SeedAsset): Promise<string> {
  // 1. Idempotency check: if this file was already seeded, return its stored URL
  const existing = await db
    .select({ url: mediaFiles.url })
    .from(mediaFiles)
    .where(and(eq(mediaFiles.name, asset.name), isNull(mediaFiles.deletedAt)))
    .limit(1);

  if (existing[0]?.url) {
    return existing[0].url;
  }

  let buffer: Buffer | null = null;
  let mime = asset.mime;

  // 2. Attempt remote download with a strict 4-second timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(asset.sourceUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
  } catch {
    // Network failure or offline mode: will use procedural vector fallback below
    buffer = null;
  }

  // 3. If remote download failed/timed out, use procedural fallback SVG
  if (!buffer || buffer.length === 0) {
    buffer = Buffer.from(asset.fallbackSvg, "utf-8");
    mime = "image/svg+xml";
  }

  // 4. Store through configured application driver (Local or R2)
  const stored = await putFileObject(mime, buffer);

  // 5. Create database record in media_files
  const [created] = await db
    .insert(mediaFiles)
    .values({
      name: asset.name,
      disk: stored.disk,
      path: stored.path,
      url: stored.url,
      mime,
      size: buffer.length,
      alt: asset.alt,
    })
    .returning({ url: mediaFiles.url });

  return created.url;
}

/** Helper to generate clean, high-resolution travel illustration SVGs */
export function generateTravelSvg(title: string, subtitle: string, colorHsl: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${colorHsl})" stop-opacity="0.95" />
      <stop offset="100%" stop-color="hsl(${colorHsl})" stop-opacity="0.8" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1" stroke-opacity="0.08" />
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)" />
  <rect width="1200" height="800" fill="url(#grid)" />
  <circle cx="600" cy="380" r="160" fill="white" fill-opacity="0.08" />
  <circle cx="600" cy="380" r="110" fill="white" fill-opacity="0.08" />
  <path d="M 520 400 L 600 320 L 680 400 Z" fill="white" fill-opacity="0.25" />
  <text x="600" y="480" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700" fill="white" text-anchor="middle" letter-spacing="-0.02em">${title}</text>
  <text x="600" y="530" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="white" fill-opacity="0.85" text-anchor="middle">${subtitle}</text>
  <text x="600" y="730" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="white" fill-opacity="0.6" text-anchor="middle" letter-spacing="0.1em">TRIPMATE TRAVEL COMMERCE</text>
</svg>`.trim();
}
