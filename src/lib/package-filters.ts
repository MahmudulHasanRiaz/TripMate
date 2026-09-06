/**
 * URL-state filtering for the public packages index (`/packages`).
 *
 * Five query params drive the index — `q` (free-text search), `cat` (category
 * slug), `dest` (destination slug), `max` (whole-taka max-price cap) and
 * `page` — and they are the single source of truth for BOTH sides of the
 * feature:
 *   - the server parses them into a `PackageFilters` value and passes it to
 *     `listPublishedListings` (filtering happens in SQL, never client-side);
 *   - the client filter island only REWRITES the URL (no fetch), so the values
 *     the page streams are exactly what this module parses back.
 *
 * Keeping parse + serialise in one pure module guarantees the canonical key
 * order and validation stay shared by the streaming grid, the pagination links
 * and the clear-filters escape. The module has no `server-only`/`"use client"`
 * directives on purpose — it is a leaf so either graph can import it.
 */

// The compact page-number row is generic pagination UI, shared with the blog
// index — it lives in src/lib/pagination.ts and is re-exported here so existing
// /packages consumers keep a stable import path.
export type { PageListEntry } from "@/lib/pagination";
export { paginationPageList } from "@/lib/pagination";

export type PackageFilters = {
  /** Free-text query (matches title / destination name). Empty = none. */
  q: string;
  /** Category slug to narrow to. Empty = none. */
  cat: string;
  /** Destination slug to narrow to. Empty = none. */
  dest: string;
  /** Whole-taka max-price cap (inclusive). `undefined` = no cap. */
  max: number | undefined;
  /** 1-based page number (always >= 1). */
  page: number;
};

export const PACKAGES_PER_PAGE = 9;

type RawParams = Readonly<Record<string, string | string[] | undefined>> | undefined;

/** A `?a=1&a=2` value is an array; filtering lists use the first entry. */
function first(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? (raw[0] ?? undefined) : raw;
}

/** Parse an integer >= 1; anything else yields the fallback. */
function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

/**
 * Parse the raw `searchParams` a page receives into the canonical filter
 * shape. Unknown keys and junk values are dropped defensively — the query
 * string is user input and must never reach SQL unvalidated.
 */
export function parsePackageSearchParams(searchParams: RawParams): PackageFilters {
  const q = (first(searchParams?.q) ?? "").trim().slice(0, 200);
  const cat = (first(searchParams?.cat) ?? "").trim().slice(0, 120);
  const dest = (first(searchParams?.dest) ?? "").trim().slice(0, 120);

  // `max` must be a whole positive taka value; anything else (blank, "0",
  // "abc") is treated as "no cap" rather than surfacing a confusing state.
  const maxRaw = (first(searchParams?.max) ?? "").trim();
  let max: number | undefined;
  if (maxRaw !== "") {
    const parsed = Number(maxRaw);
    max = Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
  }

  return {
    q,
    cat,
    dest,
    max,
    page: positiveInt(first(searchParams?.page), 1),
  };
}

/** Serialise a filter set back to query params (canonical order, empties out). */
export function packageFiltersToSearchParams(f: PackageFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.cat) params.set("cat", f.cat);
  if (f.dest) params.set("dest", f.dest);
  if (f.max !== undefined) params.set("max", String(f.max));
  if (f.page > 1) params.set("page", String(f.page));
  return params;
}

/** `/packages`, or `/packages?…` when any non-default filter/page is active. */
export function packagesIndexHref(f: PackageFilters): string {
  const query = packageFiltersToSearchParams(f).toString();
  return query ? `/packages?${query}` : "/packages";
}

/** True when the visitor has narrowed the index beyond the plain page-1 view. */
export function hasActiveFilters(f: PackageFilters): boolean {
  return Boolean(f.q || f.cat || f.dest || f.max !== undefined);
}
