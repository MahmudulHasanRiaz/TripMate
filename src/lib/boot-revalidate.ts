import { createHmac, timingSafeEqual } from "node:crypto";

import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Boot-time cache convergence (FU-31) — shared contract between the internal
 * route (`src/app/api/internal/boot-revalidate/route.ts`) and the container
 * boot client (`scripts/boot-revalidate.mjs`, which re-implements the token
 * derivation in plain .mjs — the two MUST agree; tests/boot-revalidate.test.ts
 * pins them together).
 *
 * WHY THIS EXISTS: the Docker build prerenders 'use cache' scopes against a
 * throwaway baseline-seeded database with build-time env
 * (APP_URL=http://localhost:3000), and that baked cache ships inside the
 * image. Without intervention a redeploy keeps serving the baseline brand /
 * contacts / sitemap origin until the entries expire or an admin saves
 * settings. The boot client therefore calls the internal route exactly once
 * per container start (after /api/health passes) and the route expires the
 * baked generation immediately, so the first real request re-renders from
 * the RUNTIME database + environment. Normal-operation caching is untouched.
 *
 * TOKEN: the caller never sends AUTH_SECRET itself. It sends
 * HMAC-SHA256(AUTH_SECRET, purpose) — a purpose-bound derivative that is
 * useless for session forgery, so the raw secret never travels, even over
 * the container-local loopback hop. AUTH_SECRET is per-tenant and already
 * required by every deploy (src/lib/env.ts), so no new env var is needed.
 */
export const BOOT_REVALIDATE_PATH = "/api/internal/boot-revalidate";
export const BOOT_REVALIDATE_HEADER = "x-boot-revalidate-token";

/** Purpose string binding the derived token to this one use. */
const TOKEN_PURPOSE = "tripmate:boot-revalidate:v1";

export function bootRevalidateToken(authSecret: string): string {
  return createHmac("sha256", authSecret).update(TOKEN_PURPOSE).digest("hex");
}

/** Constant-time check; null/empty/wrong-length input is simply invalid. */
export function isBootRevalidateTokenValid(
  provided: string | null | undefined,
  authSecret: string,
): boolean {
  if (!provided) return false;
  const expected = Buffer.from(bootRevalidateToken(authSecret), "utf8");
  const given = Buffer.from(provided, "utf8");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/**
 * The cache tags whose entries the baseline-seeded build can bake into the
 * image — i.e. every public-content collection the build prerenders:
 * settings (brand/contacts/SEO + robots + sitemap), the catalog and content
 * indexes, CMS pages and landing pages.
 *
 * Per-entity tags (listing-<slug>, post pages, landing-page-<id>) are
 * deliberately absent: the production baseline seeds NO packages, posts or
 * landing pages, so no per-entity entry can exist in the image cache —
 * per-entity entries are only ever created at runtime, against the live DB.
 * Admin-scope tags (leads/orders/payments) are likewise never baked into
 * public shells and stay out of this boot hook's reach.
 */
export const BOOT_REVALIDATE_TAGS: readonly string[] = [
  CACHE_TAGS.settings,
  CACHE_TAGS.listings,
  CACHE_TAGS.posts,
  CACHE_TAGS.pages,
  CACHE_TAGS.landingPages,
];
