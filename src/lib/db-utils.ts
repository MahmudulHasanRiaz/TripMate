// Shared DB-access helpers used by the module services. Pure functions — no
// `server-only` marker and no DB client import: they only shape values the
// services pass into drizzle, so they are safe to import from anywhere.

/** Escape LIKE wildcards so user search input is treated literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Clamp raw `page`/`perPage` query params into a safe window:
 *   page    ≥ 1 (floor, absent → 1)
 *   perPage 1 … maxPerPage (floor, absent → defaultPerPage)
 * and derive the row `offset` from them. Every list endpoint goes through
 * this so a crafted `?perPage=100000` can never balloon a query.
 */
export function paginate(options: {
  page?: number;
  perPage?: number;
  defaultPerPage?: number;
  maxPerPage?: number;
}): { page: number; perPage: number; offset: number } {
  const { page, perPage, defaultPerPage = 20, maxPerPage = 50 } = options;
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safePerPage = Math.min(maxPerPage, Math.max(1, Math.floor(perPage ?? defaultPerPage)));
  return { page: safePage, perPage: safePerPage, offset: (safePage - 1) * safePerPage };
}

/** drizzle wraps driver errors in DrizzleQueryError; the pg error code
 *  (e.g. 23505) lives on the underlying cause, so walk the cause chain. */
export function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth++) {
    if (typeof current === "object" && (current as { code?: string }).code === "23505") {
      return true;
    }
    current =
      typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}
