import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolvePageCacheControl } from "@/lib/cache-headers";

/**
 * FU-40 — stamp the public-page Cache-Control policy (see
 * src/lib/cache-headers.ts for the full rationale and safety rules).
 *
 * Next.js sends `private, no-cache, no-store` for every HTML response
 * because the public layout streams a session-aware header; that made
 * the Cloudflare "respect origin" cache rule useless (BYPASS on every
 * page). The proxy runs before rendering and overrides the header ONLY
 * for the cases the policy proves safe: anonymous document GETs on
 * public routes become `public, s-maxage=60, stale-while-revalidate`;
 * flight (RSC) requests and signed-in requests are pinned to
 * `private, no-store` so a personalized or flight response can never
 * be stored in — or served from — the shared edge cache.
 *
 * Everything else (non-GET, admin/account/auth areas, files, API)
 * passes through with Next's own headers untouched.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const cacheControl = resolvePageCacheControl({
    method: request.method,
    pathname: request.nextUrl.pathname,
    headerNames: new Set(request.headers.keys()),
    cookies: request.cookies.getAll(),
  });
  if (cacheControl !== null) {
    response.headers.set("Cache-Control", cacheControl);
  }
  return response;
}

export const config = {
  matcher: [
    // Page requests only: skip API routes, Next internals, the media
    // route (it sets its own immutable header), and well-known files
    // (the routes set their own headers). Mirrors the matcher shape
    // from the Next.js proxy documentation.
    "/((?!api|_next/static|_next/image|uploads|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)",
  ],
};
