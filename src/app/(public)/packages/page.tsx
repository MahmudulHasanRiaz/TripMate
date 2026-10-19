import type { Metadata } from "next";
import { Suspense } from "react";

import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import {
  PackagesExplorer,
  PackagesExplorerFallback,
} from "./_components/PackagesExplorer";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  const brand = site.title?.trim() || "TripMate";
  return {
    title: "Packages",
    description: `Browse ${brand}'s fixed Hajj, Umrah and holiday packages with transparent, all-in pricing — filter by destination, category or budget.`,
  };
}

/**
 * Packages index — /packages.
 *
 * Caching shape (Next 16 Cache Components): searchParams force the route
 * dynamic, so the page itself stays a thin shell and streams everything
 * filterable inside `<Suspense>`. The child (PackagesExplorer) reads the query
 * string OUTSIDE the cached layer, parses it into a serialisable filter value,
 * and calls the `'use cache'` grid read keyed on that value — the documented
 * equivalent of "the grid is cached per filter-key": each filter/page combo is
 * one cache entry revalidated by the CACHE_TAGS.listings contract. PPR keeps
 * this shell (title band) static while the filter-dependent region streams.
 */
export default function PackagesPage(props: PageProps<"/packages">) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
      <header className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Packages
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          Find your next journey
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Fixed-itinerary Hajj, Umrah and holiday packages with transparent,
          all-in pricing — filter by destination, category or budget.
        </p>
      </header>

      <div className="mt-10 lg:mt-12">
        <Suspense fallback={<PackagesExplorerFallback />}>
          <PackagesExplorer searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
