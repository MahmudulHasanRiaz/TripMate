import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

import { PackageCard } from "@/components/site/PackageCard";
import { PackageFilters } from "@/components/site/PackageFilters";
import {
  hasActiveFilters,
  packagesIndexHref,
  paginationPageList,
  parsePackageSearchParams,
  type PackageFilters as PackageFiltersValue,
} from "@/lib/package-filters";
import { cn } from "@/lib/utils";

import {
  getPackageFilterOptions,
  searchPackageCards,
  type PackageListData,
} from "../_lib/catalog-data";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Streamed core of /packages.
 *
 * The page renders this inside `<Suspense>` so the URL query string is read
 * here — not in the cached layer — and the per-filter grid below is the
 * documented equivalent of a "grid cached per filter-key": the free-text/cat/
 * dest/max/page values are parsed defensively into a serialisable
 * `PackageFilters` value, that value keys the `'use cache'` search read in
 * catalog-data, and whatever combination is current becomes one cached entry
 * revalidated by the listings tag. The client filter island above only rewrites
 * the URL; navigation back to a filter-key this session already streamed is a
 * cache hit, not a fresh query.
 */
export async function PackagesExplorer({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const filters = parsePackageSearchParams(await searchParams);
  const [options, result] = await Promise.all([
    getPackageFilterOptions(),
    searchPackageCards(filters),
  ]);

  return (
    <>
      <PackageFilters options={options} />

      <div className="mt-8">
        {result.total > 0 ? (
          <>
            <ResultsMeta result={result} filters={filters} />
            <div
              data-testid="package-grid"
              className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
            >
              {result.items.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  title={pkg.title}
                  destination={pkg.destination}
                  imageSrc={pkg.image?.url ?? ""}
                  imageAlt={pkg.image?.alt ?? pkg.title}
                  durationDays={pkg.durationDays ?? undefined}
                  rating={pkg.rating ?? undefined}
                  price={pkg.price ?? undefined}
                />
              ))}
            </div>
            <Pagination filters={filters} page={result.page} totalPages={result.totalPages} />
          </>
        ) : (
          <EmptyState hasFilters={hasActiveFilters(filters)} />
        )}
      </div>
    </>
  );
}

function ResultsMeta({
  result,
  filters,
}: {
  result: PackageListData;
  filters: PackageFiltersValue;
}) {
  const narrowed = hasActiveFilters(filters);
  return (
    <p
      data-testid="package-result-count"
      aria-live="polite"
      className="text-sm text-muted-foreground"
    >
      {result.total} {result.total === 1 ? "package" : "packages"}
      {narrowed ? " found" : ""}
      {filters.page > 1 ? ` · page ${result.page} of ${result.totalPages}` : ""}
    </p>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        No packages match
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {hasFilters
          ? "Try broadening your filters or clearing the search to see every available package."
          : "New packages are being prepared — check back soon."}
      </p>
      {hasFilters ? (
        <Link
          href="/packages"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
        >
          Clear all filters
        </Link>
      ) : null}
    </div>
  );
}

function Pagination({
  filters,
  page,
  totalPages,
}: {
  filters: PackageFiltersValue;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) =>
    packagesIndexHref({ ...filters, page: target });

  const pageLinkClass =
    "inline-flex size-11 items-center justify-center rounded-md text-sm font-medium transition-colors duration-150";
  const idleLink = cn(pageLinkClass, "border border-border text-foreground hover:border-foreground/40");
  const current = cn(pageLinkClass, "bg-primary font-semibold text-primary-foreground");
  const disabled = cn(
    pageLinkClass,
    "cursor-default border border-border text-muted-foreground/50",
  );

  const navLink = (target: number | null, label: string, icon: ReactNode) =>
    target === null ? (
      <span className={disabled} aria-disabled="true">
        {icon}
        <span className="sr-only">{label}</span>
      </span>
    ) : (
      <Link
        href={hrefFor(target) as Route}
        aria-label={label}
        className={cn(idleLink, "hover:border-foreground/40")}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );

  return (
    <nav aria-label="Package pages" className="mt-10 flex items-center justify-center gap-1.5">
      {navLink(page > 1 ? page - 1 : null, "Previous page", (
        <ChevronLeft className="size-4" aria-hidden="true" />
      ))}
      {paginationPageList(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} className="inline-flex size-11 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : entry === page ? (
          <span key={entry} className={current} aria-current="page">
            {entry}
          </span>
        ) : (
          <Link key={entry} href={hrefFor(entry) as Route} className={idleLink}>
            {entry}
          </Link>
        ),
      )}
      {navLink(page < totalPages ? page + 1 : null, "Next page", (
        <ChevronRight className="size-4" aria-hidden="true" />
      ))}
    </nav>
  );
}

/**
 * Suspense fallback for the explorer: a quiet, aria-hidden mirror of the
 * layout (filter bar row + one page of card-shaped blocks) so the streamed
 * content does not pop in cold. Screened from assistive tech; a sr-only line
 * carries the loading announcement.
 */
export function PackagesExplorerFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,190px)_minmax(0,190px)_minmax(0,170px)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-md bg-muted/80" />
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="aspect-[4/3] animate-pulse bg-muted/80" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/80" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
