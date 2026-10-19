import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { PACKAGES_PER_PAGE, type PackageFilters } from "@/lib/package-filters";
import {
  getListingBySlug,
  listCategories,
  listDestinations,
  listPublishedListings,
  type ListingWithRefs,
} from "@/modules/catalog/service";

/**
 * Cache-tagged public reads for the packages routes.
 *
 * Catalog SERVICE functions stay deliberately plain (no cache wiring) — this
 * module is where a public route decides "cache this DB read, tag it with the
 * listings contract, and keep it for the hours profile". Every function is a
 * `'use cache'` scope keyed by its serialisable arguments, so:
 *
 *   - the index grid is cached PER FILTER-KEY (a distinct page/filter combo is
 *     one cache entry; the "same URL twice" case is a cache hit, not a query);
 *   - admin mutations revalidate via the CACHE_TAGS contract — the listings
 *     index tag plus (on detail) the slug-scoped tag — so an edit published by
 *     Task 5's admin actions refreshes exactly the affected entries
 *     (`updateTag` = read-your-own-writes).
 *
 * Return values are plain projections (no Date fields, no class instances):
 * `'use cache'` serialises results, and the card/detail DTOs below are the
 * serialisable slice the page actually renders. Results never leak internal
 * listing columns to the client beyond what the card needs.
 */

// ---- projections ------------------------------------------------------------

/** Serializable slice of a listing that renders a PackageCard. */
export type PackageCardData = {
  id: string;
  title: string;
  slug: string;
  /** Destination name, falling back to the category name when unset. */
  destination: string;
  image: { url: string; alt: string } | null;
  durationDays: number | null;
  rating: number | null;
  price: number | null;
  /** ISO 4217 code the `price` is denominated in (catalog default BDT). */
  currency: string;
};

/** Serializable slice of a listing that renders the package detail page. */
export type PackageDetailData = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  cover: { url: string; alt: string } | null;
  gallery: { url: string; alt: string }[];
  /** Promotional video (YouTube or direct mp4), placed after the gallery (§4). */
  videoUrl: string | null;
  durationDays: number | null;
  rating: number | null;
  price: number | null;
  currency: string;
  /** Pinned/featured listing (admin-managed) → hero badge. */
  isFeatured: boolean;
  itinerary: { day: string; title: string; details: string }[];
  inclusions: string[];
  exclusions: string[];
  category: { name: string; slug: string };
  destination: { name: string; slug: string } | null;
  /** SEO overrides (validated, may be empty strings). */
  seoTitle: string;
  seoDescription: string;
  related: PackageCardData[];
};

export type PackageListData = {
  items: PackageCardData[];
  total: number;
  /** Effective 1-based page (clamped when `page` overshoots the last page). */
  page: number;
  totalPages: number;
};

export type FilterSelectOption = { value: string; label: string };
export type PackageFilterOptions = {
  categories: FilterSelectOption[];
  destinations: FilterSelectOption[];
};

function toCardData(listing: ListingWithRefs): PackageCardData {
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    destination: listing.destination?.name ?? listing.category.name,
    image: listing.coverImage
      ? { url: listing.coverImage.url, alt: listing.coverImage.alt ?? listing.title }
      : null,
    durationDays: listing.durationDays,
    rating: listing.rating,
    price: listing.price,
    currency: listing.currency,
  };
}

// ---- cached reads -----------------------------------------------------------

/**
 * One page of published listings for the index grid, cached per filter-key.
 * The "minutes" profile bounds any deploy-time baseline to a few minutes of
 * staleness before the live read takes over (the old "hours" window let a
 * build-time snapshot shadow the real DB for hours). Content is re-fetched on
 * its own cadence even without an admin touch (see cacheLife docs — always set
 * an explicit profile rather than riding the implicit `default`).
 */
export async function searchPackageCards(f: PackageFilters): Promise<PackageListData> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const toQuery = () => ({
    search: f.q || undefined,
    categorySlug: f.cat || undefined,
    destinationSlug: f.dest || undefined,
    maxPrice: f.max,
    page: f.page,
    perPage: PACKAGES_PER_PAGE,
  });

  let result = await listPublishedListings(toQuery());
  const totalPages =
    result.total === 0 ? 1 : Math.ceil(result.total / PACKAGES_PER_PAGE);

  // Hand-typed `?page=999` URLs: the requested page can overshoot the last one.
  // Rather than render an empty "no results" grid for a page that simply does
  // not exist, clamp to the last page and refetch once (correctness first; the
  // all-at-once count+rows query means this is one extra cheap round-trip on an
  // already-cached edge path).
  if (result.items.length === 0 && result.total > 0 && f.page > totalPages) {
    result = await listPublishedListings({ ...toQuery(), page: totalPages });
  }
  const page = Math.min(f.page, totalPages);

  return { items: result.items.map(toCardData), total: result.total, page, totalPages };
}

/**
 * Taxonomy options for the client filter island. Read as a cached function so
 * the category/destination selects never re-query per request; tagged with the
 * listings tag because the category/destination admin actions already
 * `updateTag(CACHE_TAGS.listings)` on any taxonomy write.
 */
export async function getPackageFilterOptions(): Promise<PackageFilterOptions> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const [categories, destinations] = await Promise.all([listCategories(true), listDestinations()]);
  return {
    categories: categories.map((c) => ({ value: c.slug, label: c.name })),
    destinations: destinations.map((d) => ({ value: d.slug, label: d.name })),
  };
}

/**
 * Everything the package detail page renders, cached by slug.
 *
 * Tag contract: the admin listing actions revalidate `CACHE_TAGS.listings`
 * (any listing change) AND the id/slug-scoped `listing-*` tags (a single
 * listing change). We attach `CACHE_TAGS.listings` up-front plus
 * `CACHE_TAGS.listing(slug)` once the row is known, so a targeted publish/edit
 * refreshes this one page immediately while broad revalidations still work.
 *
 * Returns `null` (cached) for an unknown slug so the caller can `notFound()`;
 * a newly created listing revalidates the tag and clears the null entry.
 */
export async function getPackageDetailData(slug: string): Promise<PackageDetailData | null> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const listing = await getListingBySlug(slug);
  if (!listing) return null;
  cacheTag(CACHE_TAGS.listing(slug));

  // Related = up to 3 other PUBLISHED listings in the same category, newest
  // first, excluding this one. Fetch 4 and drop self so a full category still
  // yields 3 companions; when the category has fewer than 4 rows the slice is
  // naturally short (including the empty case).
  const sameCategory = await listPublishedListings({
    categorySlug: listing.category.slug,
    perPage: 4,
  });
  const related = sameCategory.items
    .filter((other) => other.slug !== listing.slug)
    .slice(0, 3)
    .map(toCardData);

  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    summary: listing.summary,
    description: listing.description,
    cover: listing.coverImage
      ? { url: listing.coverImage.url, alt: listing.coverImage.alt ?? listing.title }
      : null,
    gallery: listing.gallery.map((image) => ({
      url: image.url,
      alt: image.alt ?? listing.title,
    })),
    videoUrl: listing.videoUrl,
    durationDays: listing.durationDays,
    rating: listing.rating,
    price: listing.price,
    currency: listing.currency,
    isFeatured: listing.isFeatured,
    itinerary: listing.itinerary,
    inclusions: listing.inclusions,
    exclusions: listing.exclusions,
    category: { name: listing.category.name, slug: listing.category.slug },
    destination: listing.destination
      ? { name: listing.destination.name, slug: listing.destination.slug }
      : null,
    seoTitle: listing.seo?.title?.trim() ?? "",
    seoDescription: listing.seo?.description?.trim() ?? "",
    related,
  };
}
