import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { listVisaServices, listVisaTypes } from "@/modules/catalog/visa-service";
import { listDestinations } from "@/modules/catalog/service";
import type { VisaServiceWithRefs, VisaType } from "@/modules/catalog/visa-service";
import type { Destination } from "@/modules/catalog/service";

export type VisaExplorerData = {
  services: VisaServiceWithRefs[];
  destinations: Destination[];
  visaTypes: VisaType[];
};

/**
 * Cached data read for the /visa page. The PAGE stays dynamic
 * (force-dynamic) so the build never executes this DB read while filling a
 * prerender cache entry (a Vercel build-time cache-fill timeout was hit when
 * the whole page was one "use cache" scope). At runtime the first request
 * fills this entry, then every visit is a cache hit keyed by listings tag;
 * admin catalog/visa mutations revalidate it via the listings tag.
 */
export async function getVisaExplorerData(): Promise<VisaExplorerData> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const [services, destinations, visaTypes] = await Promise.all([
    listVisaServices({ activeOnly: true }),
    listDestinations(true),
    listVisaTypes(true),
  ]);

  return { services, destinations, visaTypes };
}
