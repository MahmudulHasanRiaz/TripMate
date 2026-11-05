import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { origin, seoVisibilityDecision } from "@/lib/seo";
import {
  videoDisplayName,
  videoEmbedUrl,
  videoThumbnailUrl,
  type VideoEntry,
} from "@/lib/videos";
import {
  listActiveCategoryRefs,
  listActiveDestinationRefs,
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
 * Listings, destinations and posts additionally carry the sitemap image and
 * video extensions (FU-35): every cover/gallery photo becomes an <image:image>
 * entry and every video a <video:video> entry — videos only when a thumbnail
 * is derivable, since Google's video sitemap requires one. Destinations are
 * first-class entries here (previously only reachable via package filters).
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

type SitemapEntry = MetadataRoute.Sitemap[number];
type SitemapVideos = NonNullable<SitemapEntry["videos"]>;

/**
 * Absolutise a stored media URL for the sitemap: site-relative paths ("/…")
 * get the SEO origin prefixed; already-absolute URLs pass through untouched.
 * (The `url()` helper inside sitemap() only builds route paths — media URLs
 * arrive in both shapes, so they need this separate, shape-aware helper.)
 */
function abs(u: string): string {
  return u.startsWith("/") ? `${origin()}${u}` : u;
}

/** Deduped, absolutised image-extension URLs; empty when nothing usable. */
function imageUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const u of urls) {
    if (u) seen.add(abs(u));
  }
  return [...seen];
}

/**
 * One entity's videos → sitemap video-extension entries (FU-35). A video is
 * SKIPPED when no thumbnail is derivable — neither from the source itself
 * (YouTube stills) nor from the entity's fallback image — because Google's
 * video sitemap rejects thumbnail-less entries. Embeddable sources advertise
 * `player_loc`; direct files advertise `content_loc`.
 */
function videoEntries(opts: {
  videos: VideoEntry[];
  entityTitle: string;
  entityDescription: string | null;
  fallbackThumb: string | null;
  updatedAt: Date;
}): SitemapVideos {
  const entries: SitemapVideos = [];
  for (const video of opts.videos) {
    const thumbnail = videoThumbnailUrl(video.url) ?? opts.fallbackThumb;
    if (!thumbnail) continue;
    const title = videoDisplayName(video, opts.entityTitle);
    const embed = videoEmbedUrl(video.url);
    entries.push({
      title,
      thumbnail_loc: abs(thumbnail),
      description: opts.entityDescription || title,
      ...(embed ? { player_loc: embed } : { content_loc: abs(video.url) }),
      publication_date: opts.updatedAt,
    });
  }
  return entries;
}

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

  const [categories, listings, destinations, posts, pages] = await Promise.all([
    listActiveCategoryRefs(),
    listPublishedListingRefs(),
    listActiveDestinationRefs(),
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
    const images = imageUrls([
      listing.coverImage?.url,
      ...listing.gallery.map((g) => g.url),
    ]);
    const videos = videoEntries({
      videos: listing.videos,
      entityTitle: listing.title,
      entityDescription: listing.summary,
      fallbackThumb: listing.coverImage?.url ?? null,
      updatedAt: listing.updatedAt,
    });
    entries.push({
      url: url(`/packages/${listing.slug}`),
      priority: 0.8,
      lastModified: listing.updatedAt,
      ...(images.length > 0 ? { images } : {}),
      ...(videos.length > 0 ? { videos } : {}),
    });
  }

  for (const destination of destinations) {
    const images = imageUrls([
      destination.image,
      ...destination.gallery.map((g) => g.url),
    ]);
    const videos = videoEntries({
      videos: destination.videos,
      entityTitle: destination.name,
      entityDescription: destination.description,
      fallbackThumb: destination.image,
      updatedAt: destination.updatedAt,
    });
    entries.push({
      url: url(`/destinations/${destination.slug}`),
      priority: 0.7,
      lastModified: destination.updatedAt,
      ...(images.length > 0 ? { images } : {}),
      ...(videos.length > 0 ? { videos } : {}),
    });
  }

  entries.push({ url: url("/blog"), priority: 0.7 });

  for (const post of posts) {
    const images = imageUrls([
      post.featuredImage?.url,
      ...post.gallery.map((g) => g.url),
    ]);
    const videos = videoEntries({
      videos: post.videos,
      entityTitle: post.title,
      entityDescription: post.excerpt,
      fallbackThumb: post.featuredImage?.url ?? null,
      updatedAt: post.updatedAt,
    });
    entries.push({
      url: url(`/blog/${post.slug}`),
      priority: 0.6,
      lastModified: post.publishedAt ?? post.updatedAt,
      ...(images.length > 0 ? { images } : {}),
      ...(videos.length > 0 ? { videos } : {}),
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
