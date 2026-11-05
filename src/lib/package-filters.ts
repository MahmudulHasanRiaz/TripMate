/**
 * URL-state filtering for the public packages index (`/packages`).
 *
 * Six query params drive the index — `q` (free-text search), `cat` (category
 * slug), `dest` (destination slug), `duration` (trip-length bucket),
 * `max` (whole-taka max-price cap) and `page` — and they are the single
 * source of truth for BOTH sides of the feature:
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
  /** Trip-length bucket (see DURATION_BUCKETS). Empty = any duration. */
  duration: string;
  /** Whole-taka max-price cap (inclusive). `undefined` = no cap. */
  max: number | undefined;
  /** 1-based page number (always >= 1). */
  page: number;
};

export const PACKAGES_PER_PAGE = 9;

/**
 * Trip-length buckets for the `duration` param (FU-32: the homepage panel
 * always had the select, but the value never reached the URL and the index
 * had no duration filtering at all — the filter is real now, end to end).
 *
 * The value strings are the public URL contract: the panel's duration
 * select emits exactly these and the /packages filter island mirrors them.
 * Bounds are INCLUSIVE day counts matched against the listing's
 * `durationDays` column:
 *   "1-3"  → 1–3 days    "4-7"  → 4–7 days
 *   "8-14" → 8–14 days   "15+"  → 15 days and up (no upper bound)
 * A listing with NO recorded duration (NULL) matches no bucket — a bucket
 * is a promise about trip length, and an unknown length cannot keep it.
 */
export const DURATION_BUCKETS = ["1-3", "4-7", "8-14", "15+"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

const DURATION_RANGES: Record<DurationBucket, { min: number; max?: number }> = {
  "1-3": { min: 1, max: 3 },
  "4-7": { min: 4, max: 7 },
  "8-14": { min: 8, max: 14 },
  "15+": { min: 15 },
};

export function isDurationBucket(raw: string): raw is DurationBucket {
  return (DURATION_BUCKETS as readonly string[]).includes(raw);
}

/** Inclusive day bounds for a bucket value; `undefined` for empty/junk. */
export function durationRangeForBucket(
  bucket: string,
): { min: number; max?: number } | undefined {
  return isDurationBucket(bucket) ? DURATION_RANGES[bucket] : undefined;
}

/** Option list for the /packages filter island (value = URL bucket). */
export const DURATION_OPTIONS: { value: DurationBucket; label: string }[] = [
  { value: "1-3", label: "1–3 days" },
  { value: "4-7", label: "4–7 days" },
  { value: "8-14", label: "8–14 days" },
  { value: "15+", label: "15+ days" },
];

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
  // Canonical key is `dest` (a destination slug). The long-standing
  // `destination` alias (emitted for years by destination pages with a
  // display NAME, e.g. ?destination=Singapore) is accepted and slugified
  // so those links land filtered instead of silently showing everything
  // (FU-28: the alias was ignored entirely — the site's own destination
  // CTAs appeared broken).
  const destRaw = (first(searchParams?.dest) ?? "").trim().slice(0, 120);
  const destAlias = (first(searchParams?.destination) ?? "").trim().slice(0, 120);
  const dest =
    destRaw ||
    destAlias
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // `duration` must be one of the known buckets; anything else is "any
  // duration". Tolerance: a hand-typed `?duration=15+` decodes the `+` as
  // a space (form-encoding), landing here as "15" after the trim — accept
  // that spelling too so a pasted link still filters (FU-28's lesson: the
  // site's own links must land filtered). Serialisation always emits the
  // canonical "15+".
  const durationRaw = (first(searchParams?.duration) ?? "").trim().slice(0, 10);
  const duration = isDurationBucket(durationRaw)
    ? durationRaw
    : durationRaw === "15"
      ? "15+"
      : "";

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
    duration,
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
  if (f.duration) params.set("duration", f.duration);
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
  return Boolean(f.q || f.cat || f.dest || f.duration || f.max !== undefined);
}
