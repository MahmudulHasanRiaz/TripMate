import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { origin, seoVisibilityDecision } from "@/lib/seo";
import {
  listActiveCategoryRefs,
  listPublishedListingRefs,
} from "@/modules/catalog/service";
import {
  listPublishedPageRefs,
  listPublishedPostRefs,
} from "@/modules/content/service";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";

/**
 * Generated sitemap.xml.
 *
 * URL surface mirrors the public site's reachable content, grouped roughly by
 * crawl priority: home (1.0) → catalog indexes → per-content detail pages.
 * The seeded DB has no posts, so /blog/[slug] entries appear only once content
 * ships (each <url> block is data-driven, never a hard-coded skeleton).
 *
 * Caching contract (Next 16 Cache Components): `'use cache'` makes this special
 * Route Handler's output a cache entry; `cacheTag` binds it to the listings,
 * posts and pages tag contract so an admin publish/edit/trash that calls
 * `revalidateTag(tag, "max")` refreshes exactly the affected URLs (categories
 * are edited under the listings tag — see the catalog service-data module);
 * `cacheLife("hours")` mirrors the public content pages' explicit lifetime.
 * `/services` skips redirect-kind landings: those pages exist mostly to bounce
 * to a partner site, so advertising them invites crawling thin doors.
 *
 * VISIBILITY (Plan 6 T3): when settings.site searchEngineVisibility is false
 * the sitemap is EMPTY — returned before any catalog/content query runs — in
 * lockstep with robots.ts (`Disallow: /`) and the (public) layout metadata
 * (noindex,nofollow). All three read the same cached settings row
 * (getPublicSiteSettings), so they can never disagree.
 *
 * NOTE: the docs describe `sitemap.ts` as a Route Handler cached by default,
 * but relying on that alone would leave the URL list stale after admin content
 * writes. Marking the handler itself a cached function reuses the same
 * tag/revalidation path the pages use, so a publish is live in the sitemap one
 * cache hop later — verified against node_modules/next/dist/docs (sitemap.md +
 * cacheComponents guides) before wiring. CACHE_TAGS.settings is tagged HERE as
 * well: a nested `'use cache'` call's tags (getPublicSiteSettings's own) do
 * not invalidate THIS entry, so the outer scope carries the tag itself for a
 * visibility toggle to land in one cache hop.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheTag(CACHE_TAGS.posts);
  cacheTag(CACHE_TAGS.pages);
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  // Hidden site → empty sitemap, decided before any catalog/content query.
  const site = await getPublicSiteSettings();
  if (!seoVisibilityDecision(site.searchEngineVisibility).includeSitemapUrls) {
    return [];
  }

  // The origin helper collapses any trailing slash on APP_URL so a URL string
  // is always origin + "/" + path (never origin + "//" + path).
  const url = (path: string): string => `${origin()}${path}`;

  const [categories, listings, posts, pages] = await Promise.all([
    listActiveCategoryRefs(),
    listPublishedListingRefs(),
    listPublishedPostRefs(),
    listPublishedPageRefs(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: url("/"), priority: 1 },
    { url: url("/packages"), priority: 0.9 },
  ];

  for (const category of categories) {
    if (category.kind === "redirect") continue;
    entries.push({
      url: url(`/services/${category.slug}`),
      priority: 0.8,
      lastModified: category.updatedAt,
    });
  }

  for (const listing of listings) {
    entries.push({
      url: url(`/packages/${listing.slug}`),
      priority: 0.8,
      lastModified: listing.updatedAt,
    });
  }

  entries.push({ url: url("/blog"), priority: 0.7 });

  for (const post of posts) {
    entries.push({
      url: url(`/blog/${post.slug}`),
      priority: 0.6,
      lastModified: post.publishedAt ?? post.updatedAt,
    });
  }

  for (const page of pages) {
    entries.push({
      url: url(`/${page.slug}`),
      priority: 0.5,
      lastModified: page.updatedAt,
    });
  }

  return entries;
}
