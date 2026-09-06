/**
 * Route-level loading fallback for the (public) route group.
 *
 * Renders inside the (public) layout's <main> — the header/footer chrome stays
 * live — while a navigation's RSC payload for the target page is still in
 * flight. It is deliberately generic because it fronts every public route
 * (home hero, index title-bands, detail heroes), so it mirrors the site's
 * dominant rhythm of a hero-style band followed by card-grid sections, using
 * the same muted/`bg-card` skeleton language as the per-page <Suspense>
 * fallbacks (Tokens only — no palette literals).
 *
 * It is NOT a replacement for those per-page fallbacks: pages that stream
 * (packages/blog/detail) still serve their own exact-layout fallback AFTER the
 * page shell arrives, so the two are complementary, never stacked — this file
 * only covers the gap before the payload is available, so a slow RTT never
 * leaves a blank <main>.
 *
 * Screened from assistive tech; a sr-only line carries the loading
 * announcement (pattern shared with the explorer fallbacks).
 */
export default function PublicLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div aria-hidden="true" className="select-none">
        {/* Hero band — full-bleed stand-in (home hero, package/blog covers). */}
        <div className="h-[320px] w-full animate-pulse bg-muted/80 md:h-[420px] lg:h-[460px]" />

        {/* First section — heading + a 3-up card grid (home featured band,
            /packages + /blog indexes, service landings). */}
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-muted/80" />
            <div className="mx-auto h-8 w-3/5 animate-pulse rounded-lg bg-muted/80" />
            <div className="mx-auto h-4 w-4/5 animate-pulse rounded bg-muted/80" />
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="aspect-[4/3] animate-pulse bg-muted/80" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted/80" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
