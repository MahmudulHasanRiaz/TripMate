import { readFile } from "node:fs/promises";
import {
  legacyUploadsRoot,
  localUploadsRoot,
  resolveUnderRoot,
} from "@/modules/media/storage";

/**
 * Hardened serving route for locally-stored media objects
 * (STORAGE_LOCAL_DIR, default storage/uploads).
 *
 * Why a route instead of static serving: the local driver used to write into
 * `public/uploads`, which Next serves same-origin as a plain static file — a
 * malicious SVG navigated to directly would execute script on the site's
 * origin. This route is the only serving path for the new storage root and
 * applies, on every response:
 *   - an extension-whitelisted Content-Type (only the 5 types the media
 *     validation layer ever stores; anything else 404s — fail closed)
 *   - X-Content-Type-Options: nosniff
 *   - for SVG additionally a sandboxing Content-Security-Policy (no script
 *     execution, no external loads) + explicit Content-Disposition: inline
 *   - for everything else an immutable cache (keys are uuid-stamped and
 *     never rewritten)
 *
 * COMPAT: files uploaded before the storage-root change live under
 * `public/uploads`. If Next's static public handler has not already claimed
 * the URL, the route falls back to that legacy directory (same traversal-safe
 * resolver, same hardened headers) so old links keep resolving regardless of
 * which handler wins the /uploads/* path.
 */

/** The only Content-Types this route ever emits — the media whitelist's
 *  extensions (see MIME_EXTENSIONS in media/validation.ts). */
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function extensionOf(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot >= 0 ? key.slice(dot).toLowerCase() : "";
}

function fileResponse(
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
  isSvg: boolean,
): Response {
  if (isSvg) {
    // The CSP strips an SVG of every execution capability: no scripts, no
    // external fetches; only inline presentation attributes/styles survive so
    // the image still renders.
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; media-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const key = (path ?? []).join("/");
  if (!key) return notFound();

  const ext = extensionOf(key);
  const contentType = CONTENT_TYPES[ext];
  // Unknown / missing extension: the storage layer never writes one, so this
  // is not a media object — refuse rather than guess a type.
  if (!contentType) return notFound();
  const isSvg = ext === ".svg";

  // Primary: the configured storage root. Fallback: the legacy public/uploads
  // directory (pre-storage-root files). Both go through the SAME
  // traversal-safe resolver the local driver uses, so a crafted key can never
  // escape either directory.
  const roots = [localUploadsRoot(), legacyUploadsRoot()];
  for (const root of roots) {
    const full = resolveUnderRoot(root, key);
    if (!full) continue;
    try {
      const bytes = await readFile(full);
      // Copy into a standalone Uint8Array (BodyInit wants an
      // ArrayBuffer-backed view; a Buffer can be a slice of a pooled
      // ArrayBuffer, so its backing store cannot be used zero-copy).
      const body = Uint8Array.from(bytes);
      return fileResponse(body, contentType, isSvg);
    } catch {
      // Not present under this root — try the next (or 404 below).
    }
  }
  return notFound();
}
