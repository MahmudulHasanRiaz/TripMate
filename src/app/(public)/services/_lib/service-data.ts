import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getCategoryBySlug,
  listPublishedListings,
  type ListingWithRefs,
} from "@/modules/catalog/service";
import { listServiceOptions } from "@/modules/catalog/visa-service";
import { formConfigSchema, type FormConfig } from "@/modules/landing-pages/section-types";
import type { ServiceKind } from "@/modules/catalog/validation";

function toFormConfig(value: unknown): FormConfig | null {
  const parsed = formConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Cache-tagged read for the /services/{slug} category landing.
 *
 * Categories carry NO description/image columns (see src/modules/catalog/
 * schema.ts — name/slug/kind/redirectUrl/icon only), so the content on this
 * page is the category name + kind + icon, and for `package` categories the
 * published listings underneath it. Description text arrives in Plan 4 when
 * categories gain an editable body.
 *
 * Tag contract: tagged with the broad `CACHE_TAGS.listings` tag because BOTH
 * category writes and listing writes in the catalog admin already revalidate
 * that tag — so a rename, an activate/deactivate or a publish/unpublish of any
 * listing in the category refreshes this page one cache hop later. There is no
 * per-category tag today; the category page (unlike a single listing page) has
 * no slug-scoped listing tag to attach, and the global tag is the correct
 * scope for a page whose content spans a whole category.
 *
 * Returns a serialisable projection (no Date fields, no class instances — the
 * `'use cache'` boundary) and `null` for an unknown/inactive slug so the
 * caller can `notFound()`.
 */

/** Serializable slice of a listing that renders a PackageCard. */
export type ServiceListingCard = {
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


/** Serializable slice of an active service option. */
export type ServiceOptionCardData = {
  id: string;
  title: string;
  slug: string;
  duration: string | null;
  price: number;
  deliveryTime: string | null;
  requirements: string[];
  description: string | null;
  sortOrder: number;
};

/** Serializable slice of a service category that renders the landing page. */
export type ServicePageData = {
  id: string;
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
  icon: string | null;
  /** Published listings in this category (empty for non-package kinds). */
  listings: ServiceListingCard[];
  primaryListing?: {
    id: string;
    title: string;
    formConfig: FormConfig | null;
  } | null;
  /** Active service options for inquiry_based categories (e.g. Passport 5-Year, 10-Year). */
  serviceOptions: ServiceOptionCardData[];
};

function toCardData(listing: ListingWithRefs): ServiceListingCard {
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

export async function getServicePageData(slug: string): Promise<ServicePageData | null> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("hours");

  const category = await getCategoryBySlug(slug);
  if (!category) return null;

  const [listings, rawOptions] = await Promise.all([
    category.kind === "package"
      ? listPublishedListings({ categorySlug: category.slug })
      : category.kind === "inquiry_based"
        ? listPublishedListings({ categorySlug: category.slug, perPage: 1 })
        : Promise.resolve({ items: [] }),
    category.kind === "inquiry_based"
      ? listServiceOptions({ categoryId: category.id, activeOnly: true })
      : Promise.resolve([]),
  ]);

  const firstInquiryListing =
    category.kind === "inquiry_based" && listings.items.length > 0
      ? listings.items[0]
      : null;

  const serviceOptions: ServiceOptionCardData[] = rawOptions.map((opt) => ({
    id: opt.id,
    title: opt.title,
    slug: opt.slug,
    duration: opt.duration,
    price: opt.price,
    deliveryTime: opt.deliveryTime,
    requirements: opt.requirements,
    description: opt.description,
    sortOrder: opt.sortOrder,
  }));

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    kind: category.kind,
    redirectUrl: category.redirectUrl,
    icon: category.icon,
    listings: category.kind === "package" ? listings.items.map(toCardData) : [],
    primaryListing: firstInquiryListing
      ? {
          id: firstInquiryListing.id,
          title: firstInquiryListing.title,
          formConfig: toFormConfig(firstInquiryListing.formConfig),
        }
      : null,
    serviceOptions,
  };
}

