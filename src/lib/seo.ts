import { getEnv } from "@/lib/env";

/**
 * Absolute origin for SEO URLs (sitemap entries + the robots Sitemap line).
 *
 * Any trailing slashes are collapsed off `APP_URL` so that concatenating a
 * path can never produce a doubled separator (`https://host//sitemap.xml`).
 * This is the single source of truth shared by sitemap.ts and robots.ts — those
 * two special routes must never disagree about the base URL. Both files are
 * deliberately env-only (no DB read) so they keep answering pre-setup.
 */
export function origin(): string {
  return getEnv().APP_URL.replace(/\/+$/, "");
}
