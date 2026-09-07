import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { origin, seoVisibilityDecision } from "@/lib/seo";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";

/**
 * Generated robots.txt.
 *
 * The public crawlable surface is allowed; the auth/account/admin/setup and
 * API namespaces are admin-only and never meant for a search index. The
 * sitemap line uses the shared trailing-slash-normalised origin helper (the
 * same one sitemap.ts builds its URLs from) so the two files can never
 * disagree about the base URL — and an `APP_URL` with a trailing slash can
 * never yield a doubled `//` separator.
 *
 * VISIBILITY (Plan 6 T3): when settings.site searchEngineVisibility is false
 * the rules collapse to a single `Disallow: /` — the whole site asks crawlers
 * to stay out, in lockstep with sitemap.ts (empty) and the (public) layout
 * metadata (noindex,nofollow). All three read the SAME cached settings row
 * (getPublicSiteSettings), so they can never disagree.
 *
 * Caching contract (mirrors sitemap.ts): `robots.ts` is a special Route
 * Handler; marking the handler itself `'use cache'` + `cacheTag(settings)`
 * means an admin settings save calling `updateTag(CACHE_TAGS.settings)`
 * refreshes robots.txt in one cache hop — relying on the handler being
 * "cached by default" would bake the visibility flag in with no invalidation
 * path. `cacheLife("hours")` keeps the lifetime explicit. A missing/corrupt
 * settings row degrades to the default (visibility true → indexable), never a
 * thrown parse — the same defensive projection every settings read uses.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  const site = await getPublicSiteSettings();

  return {
    rules: seoVisibilityDecision(site.searchEngineVisibility).robots,
    // Always advertised: when hidden, sitemap.ts serves an empty URL list, so
    // the pointer is harmless and the two files stay in lockstep either way.
    sitemap: `${origin()}/sitemap.xml`,
  };
}
