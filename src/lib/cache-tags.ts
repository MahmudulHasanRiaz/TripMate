/**
 * Cache tag registry — the single source of truth for revalidation tags.
 *
 * Public content routes tag their cached reads with these so admin mutations
 * can invalidate exactly the affected data via `revalidateTag`. The TAG
 * CONTRACT is independent of the caching transport underneath (Cache
 * Components with `cacheTag` today; the strings themselves are the contract
 * Tasks 5/8/10-12 consume).
 *
 * Usage in a cached scope (`'use cache'`):
 *   cacheTag(CACHE_TAGS.listings)
 *   cacheTag(CACHE_TAGS.listing(pkg.slug))
 *
 * Usage after an admin mutation (Server Function / Route Handler):
 *   revalidateTag(CACHE_TAGS.listings, "max")         // stale-while-revalidate
 *   updateTag(CACHE_TAGS.listings)                    // read-your-own-writes
 *
 * NOTE (Next 16.3.4): the single-argument `revalidateTag(tag)` form is
 * DEPRECATED and behaves like `{ expire: 0 }`. Always pass a second argument.
 */
export const CACHE_TAGS = {
  /** Catalog index/listing pages (packages grid, filters). */
  listings: "listings",
  /** One catalog entity, keyed by its slug. */
  listing: (id: string) => `listing-${id}`,
  /** Blog/content collection index. */
  posts: "posts",
  /** Static content pages (about, terms, etc.). */
  pages: "pages",
  /** Site-wide settings (brand, contact, hero copy). */
  settings: "settings",
  /** Lead collection + management (kanban, detail, board counts). */
  leads: "leads",
  /** One lead, keyed by its id. */
  lead: (id: string) => `lead-${id}`,
  /** Landing pages collection (builder list, /l/ render). */
  landingPages: "landing-pages",
  /** One landing page, keyed by its id. */
  landingPage: (id: string) => `landing-page-${id}`,
} as const;
