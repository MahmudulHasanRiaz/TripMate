/**
 * Compact pagination page-list shared by the /packages and /blog indexes.
 * Pure leaf — no server-only/client directives, so either graph can import it.
 */

/** Ellipsis marker used in the compact page-number row. */
export type PageListEntry = number | "gap";

/**
 * Compact page list: first, last and a sliding window around the current page,
 * with `gap` entries for the runs in between — "1 … 4 5 [6] 7 … 12".
 */
export function paginationPageList(current: number, totalPages: number): PageListEntry[] {
  if (totalPages <= 7) {
    return range(1, totalPages);
  }
  const entries: PageListEntry[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) entries.push("gap");
  for (let n = start; n <= end; n++) entries.push(n);
  if (end < totalPages - 1) entries.push("gap");
  entries.push(totalPages);
  return entries;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}
