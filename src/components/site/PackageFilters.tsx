"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type PackageFilterSelectOption = { value: string; label: string };

/** Plain-data options passed from the server (no fetch happens in the island). */
type PackageFilterOptions = {
  categories: PackageFilterSelectOption[];
  destinations: PackageFilterSelectOption[];
};

const DEBOUNCE_MS = 300;

/** Shared field chrome — matches the SiteFooter newsletter input exactly. */
const FIELD =
  "h-11 w-full min-w-0 rounded-md border border-input bg-background text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const FIELD_SELECT = cn(
  FIELD,
  "cursor-pointer appearance-none pl-3 pr-9 disabled:cursor-not-allowed disabled:opacity-50",
);

const FIELD_SEARCH = cn(FIELD, "pl-9");

type Fields = { q: string; cat: string; dest: string; max: string };

function fieldParams(searchParams: URLSearchParams): Fields {
  return {
    q: searchParams.get("q") ?? "",
    cat: searchParams.get("cat") ?? "",
    dest: searchParams.get("dest") ?? "",
    max: searchParams.get("max") ?? "",
  };
}

/**
 * Filter bar for /packages (spec §3 PageFilters). Pure URL island: a change
 * debounced-rewrites the query string via `router.replace` (scroll:false) and
 * the server streams a fresh cached grid for that filter-key — this component
 * never fetches, never holds results.
 *
 * Free-text fields (q, max) debounce 300ms so mid-word states don't hammer the
 * URL; the taxonomy selects commit immediately. The URL is the single source of
 * truth: an external navigation (back/forward, pagination, clear-filters) syncs
 * back into the controls via the searchParams effect below.
 */
export function PackageFilters({ options }: { options: PackageFilterOptions }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState<Fields>(() => fieldParams(searchParams));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror the URL back into the controls whenever it changes externally
  // (browser back/forward, a pagination link, or the empty-state clear link).
  // Adjusted during render (not an effect) by remembering the last params we
  // synced from — the React-documented "adjust state when a prop changes"
  // pattern, which avoids the cascading render of a setState-in-effect.
  const [lastParams, setLastParams] = useState(searchParams);
  if (lastParams !== searchParams) {
    setLastParams(searchParams);
    setFields(fieldParams(searchParams));
  }

  // If the island unmounts (route change) while a keystroke is mid-debounce,
  // cancel the pending commit so it can't router.replace after we're gone.
  // Cleanup-only effect: no setState in the body, so it never cascades renders.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const commit = (next: Fields) => {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.cat) params.set("cat", next.cat);
    if (next.dest) params.set("dest", next.dest);
    if (next.max) params.set("max", next.max);
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    router.replace(target as Route, { scroll: false });
  };

  /** Update state immediately; rewrite the URL now or after the debounce. */
  const changeField = (key: keyof Fields, value: string, immediate = false) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      commit(next);
    } else {
      debounceRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
    }
  };

  const clearAll = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const empty: Fields = { q: "", cat: "", dest: "", max: "" };
    setFields(empty);
    commit(empty);
  };

  const active =
    fields.q !== "" || fields.cat !== "" || fields.dest !== "" || fields.max !== "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,190px)_minmax(0,190px)_minmax(0,170px)_auto]">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="package-search">
            Search packages
          </label>
          <input
            id="package-search"
            type="text"
            autoComplete="off"
            className={FIELD_SEARCH}
            placeholder="Search packages, destinations…"
            aria-label="Search packages"
            value={fields.q}
            onChange={(e) => changeField("q", e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="relative">
          <label className="sr-only" htmlFor="package-category">
            Category
          </label>
          <select
            id="package-category"
            className={cn(FIELD_SELECT, fields.cat === "" && "text-muted-foreground")}
            aria-label="Category"
            value={fields.cat}
            onChange={(e) => changeField("cat", e.target.value, true)}
          >
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c.value} value={c.value} className="text-foreground">
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        {/* Destination */}
        <div className="relative">
          <label className="sr-only" htmlFor="package-destination">
            Destination
          </label>
          <select
            id="package-destination"
            className={cn(FIELD_SELECT, fields.dest === "" && "text-muted-foreground")}
            aria-label="Destination"
            value={fields.dest}
            onChange={(e) => changeField("dest", e.target.value, true)}
          >
            <option value="">All destinations</option>
            {options.destinations.map((d) => (
              <option key={d.value} value={d.value} className="text-foreground">
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        {/* Max price */}
        <div className="relative">
          <label className="sr-only" htmlFor="package-max">
            Maximum price in taka
          </label>
          <input
            id="package-max"
            type="number"
            min={1}
            step={1000}
            inputMode="numeric"
            className={cn(FIELD, "px-3", fields.max === "" && "text-muted-foreground")}
            placeholder="Max price (৳)"
            aria-label="Maximum price in taka"
            value={fields.max}
            onChange={(e) => changeField("max", e.target.value)}
          />
        </div>

        {/* Clear all */}
        <button
          type="button"
          onClick={clearAll}
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
            active
              ? "text-primary hover:bg-secondary"
              : "cursor-default text-muted-foreground/60",
          )}
          disabled={!active}
          data-active={active || undefined}
        >
          <X className="size-4" aria-hidden="true" />
          Clear all
        </button>
      </div>
    </div>
  );
}
