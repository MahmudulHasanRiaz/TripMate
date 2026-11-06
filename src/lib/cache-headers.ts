/**
 * FU-40 — public-page Cache-Control policy (consumed by src/proxy.ts).
 *
 * Why this exists: the public site sits behind Cloudflare with a
 * "respect origin" cache rule, but Next.js marks every HTML response
 * `private, no-cache, no-store` because the (public) layout streams a
 * session-aware header (SiteHeaderGate) inside a Suspense boundary —
 * one dynamic hole makes the whole document uncacheable, so the edge
 * answered BYPASS for every page and the CDN never helped.
 *
 * The fix is deliberately narrow. A response may be marked public ONLY
 * when nothing in it can be personal:
 *
 *  - Document requests only (GET/HEAD). POSTs (server actions) and
 *    other methods are left untouched.
 *  - Public route areas only. /admin, /account, the auth pages
 *    (/login, /signup), /setup, /api and /uploads keep Next's defaults.
 *  - Anonymous only. Any better-auth session cookie (session_token or
 *    the cookie-cache session_data, with or without the `__Secure-`
 *    prefix) forces `private` — a signed-in visitor's streamed header
 *    carries their identity and must never enter a shared cache. An
 *    empty cookie value counts as anonymous (post-sign-out residue).
 *  - Real documents only. App Router also answers CLIENT navigations
 *    at the same URL with an RSC flight payload (text/x-component)
 *    when the request carries RSC / Next-Router-* headers. Cloudflare
 *    does not segment its cache by those headers (it honours Vary only
 *    for Accept-Encoding), so a cached flight payload would be served
 *    to browsers expecting HTML — the documented "RSC cache poisoning"
 *    failure. Flight requests therefore always get `private, no-store`
 *    and only plain document responses are ever stored at the edge.
 *
 * The public value mirrors the pattern already proven on the EcoMate
 * storefronts: browsers revalidate every time (max-age=0, cheap
 * against the edge), the shared cache holds a copy for 60s and may
 * serve it stale for a further 300s while revalidating.
 */
export const PUBLIC_PAGE_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export const PRIVATE_PAGE_CACHE_CONTROL =
  "private, no-cache, no-store, max-age=0, must-revalidate";

/** Route areas that must never be publicly cached. Prefix match on a
 *  path-segment boundary, so `/administrator` would not match `/admin`. */
const NON_PUBLIC_PREFIXES = [
  "/admin",
  "/account",
  "/api",
  "/login",
  "/signup",
  "/setup",
  "/uploads",
] as const;

/** Request headers App Router sends for flight (RSC) responses instead
 *  of HTML documents. Presence of ANY of them means "not a document". */
const FLIGHT_HEADER_NAMES = [
  "rsc",
  "next-router-prefetch",
  "next-router-state-tree",
  "next-router-segment-prefetch",
] as const;

/** better-auth cookie names, matched as a suffix so the `__Secure-`
 *  production prefix is covered too. session_data is the cookie-cache
 *  companion cookie (auth.ts enables cookieCache) — it is only issued
 *  alongside a live session, so it counts as signed-in evidence. */
const SESSION_COOKIE_SUFFIXES = [
  "better-auth.session_token",
  "better-auth.session_data",
] as const;

export interface PageCacheDecisionInput {
  method: string;
  pathname: string;
  /** Lower-cased names of the request headers present. */
  headerNames: ReadonlySet<string>;
  cookies: ReadonlyArray<{ name: string; value: string }>;
}

function isNonPublicPath(pathname: string): boolean {
  return NON_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Files in public/ and other extensioned assets are not pages. */
function looksLikeStaticFile(pathname: string): boolean {
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

function hasSessionCookie(
  cookies: PageCacheDecisionInput["cookies"],
): boolean {
  return cookies.some(
    (cookie) =>
      cookie.value.trim() !== "" &&
      SESSION_COOKIE_SUFFIXES.some((suffix) => cookie.name.endsWith(suffix)),
  );
}

/**
 * Decide the Cache-Control for a page response.
 *
 * Returns the header value to set, or `null` to leave the response
 * exactly as Next.js produced it.
 */
export function resolvePageCacheControl(
  input: PageCacheDecisionInput,
): string | null {
  if (input.method !== "GET" && input.method !== "HEAD") return null;
  if (looksLikeStaticFile(input.pathname)) return null;
  if (isNonPublicPath(input.pathname)) return null;

  const isFlightRequest = FLIGHT_HEADER_NAMES.some((name) =>
    input.headerNames.has(name),
  );
  if (isFlightRequest) return PRIVATE_PAGE_CACHE_CONTROL;
  if (hasSessionCookie(input.cookies)) return PRIVATE_PAGE_CACHE_CONTROL;
  return PUBLIC_PAGE_CACHE_CONTROL;
}
