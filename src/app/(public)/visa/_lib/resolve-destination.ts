/**
 * Resolve the /visa `?destination=` deep-link to a destination id.
 *
 * The homepage TravelActionPanel (and its visa service cards) link here
 * with the destination DISPLAY NAME — `/visa?destination=Malaysia%20%26%20Singapore`
 * — because that is what the panel's country select holds. The explorer,
 * though, filters by destination id, so the page resolves the param
 * server-side against the destinations that actually have visa services:
 * an exact case-insensitive NAME match wins, a slug is accepted as a
 * fallback, and anything else resolves to `null` (the explorer simply
 * opens unfiltered — a stale or hand-typed link must never dead-end).
 *
 * Pure and import-free on purpose (the caller passes plain rows) so the
 * resolution rule is unit-testable without the catalog service graph.
 */
export function resolveVisaDestinationId(
  rawParam: string | string[] | undefined,
  destinations: ReadonlyArray<{ id: string; name: string; slug: string }>,
): string | null {
  const raw = (Array.isArray(rawParam) ? rawParam[0] : rawParam)?.trim();
  if (!raw) return null;
  const needle = raw.toLowerCase();
  return (
    destinations.find((d) => d.name.trim().toLowerCase() === needle)?.id ??
    destinations.find((d) => d.slug.toLowerCase() === needle)?.id ??
    null
  );
}
