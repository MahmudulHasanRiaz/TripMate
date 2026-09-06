import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getEnv } from "@/lib/env";
import {
  listActiveCategoryRefs,
  listPublishedListingRefs,
} from "@/modules/catalog/service";
import {
  listPublishedPageRefs,
  listPublishedPostRefs,
} from "@/modules/content/service";

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
 * NOTE: the docs describe `sitemap.ts` as a Route Handler cached by default,
 * but relying on that alone would leave the URL list stale after admin content
 * writes. Marking the handler itself a cached function reuses the same
 * tag/revalidation path the pages use, so a publish is live in the sitemap one
 * cache hop later — verified against node_modules/next/dist/docs (sitemap.md +
 * cacheComponents guides) before wiring.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheTag(CACHE_TAGS.posts);
  cacheTag(CACHE_TAGS.pages);
  cacheLife("hours");

  const origin = getEnv().APP_URL.replace(/\/+$/, "");
  const url = (path: string): string => `${origin}${path}`;

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
      url: url(`/p/${page.slug}`),
      priority: 0.5,
      lastModified: page.updatedAt,
    });
  }

  return entries;
}
