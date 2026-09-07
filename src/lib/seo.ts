import type { MetadataRoute } from "next";

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

// ---- searchEngineVisibility decision -------------------------------------------

/**
 * The ONE pure decision both special SEO routes share for the
 * settings.site searchEngineVisibility flag (Plan 6 T3):
 *
 *   - visible  → robots allows the public surface (admin namespaces stay
 *     disallowed) and the sitemap enumerates URLs (both behave exactly as
 *     they did before the flag existed),
 *   - hidden   → robots disallows EVERYTHING (a single `Disallow: /`) and the
 *     sitemap is empty.
 *
 * Extracted as a pure helper so robots.ts and sitemap.ts can never disagree
 * (they read the same cached settings row and feed the same boolean in), and
 * so the decision is unit-testable without a DB. The routes themselves stay
 * DB-dependent (they read getPublicSiteSettings) and are deliberately
 * uncovered by unit tests — typecheck + build pin their wiring; there is no
 * robots/sitemap e2e suite today.
 */
export type SeoVisibilityDecision = {
  /** Rule set for MetadataRoute.Robots — one rule, all user agents. */
  robots: NonNullable<MetadataRoute.Robots["rules"]>;
  /** Whether sitemap.ts should enumerate URLs at all (false → empty sitemap). */
  includeSitemapUrls: boolean;
};

export function seoVisibilityDecision(visible: boolean): SeoVisibilityDecision {
  if (visible) {
    return {
      robots: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/api", "/setup"],
      },
      includeSitemapUrls: true,
    };
  }
  return {
    robots: { userAgent: "*", disallow: "/" },
    includeSitemapUrls: false,
  };
}
