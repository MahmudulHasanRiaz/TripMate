import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { listCategories, listDestinations } from "@/modules/catalog/service";
import { resolveServiceHref, type NavModelInput } from "./nav-model";

/**
 * Header navigation data feed (FU-33).
 *
 * One cached read of the tenant's live taxonomy — the same
 * `listCategories(true)` / `listDestinations(true)` reads (and the same
 * admin order: sortOrder, then name) that power /services, the homepage
 * panel and the /packages filter — projected down to the plain slices
 * buildNavModel consumes. Service hrefs are resolved HERE, server-side,
 * with the shared resolver, so the client header only ever renders
 * finished links.
 *
 * Cache contract: tagged with the listings tag, exactly like
 * getPackageFilterOptions — the catalog admin actions already
 * `updateTag(CACHE_TAGS.listings)` on any category/destination write,
 * and the FU-31 boot revalidation expires the same tag, so a taxonomy
 * edit (or a fresh deploy) refreshes the header menu in one hop.
 */
export async function getHeaderNavData(): Promise<NavModelInput> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const [categories, destinations] = await Promise.all([
    listCategories(true),
    listDestinations(true),
  ]);

  return {
    packageCategories: categories.map((c) => ({ label: c.name, slug: c.slug })),
    services: categories.map((c) => ({ label: c.name, ...resolveServiceHref(c) })),
    destinations: destinations.map((d) => ({ label: d.name, slug: d.slug })),
  };
}
