import PlaneLoader from "@/components/PlaneLoader";

/**
 * Route-level loading fallback for the (public) route group.
 *
 * Renders inside the (public) layout's <main> — the header/footer chrome
 * stays live — while a navigation's RSC payload is still in flight. The
 * loading face is the project's shared paper-plane loader (PlaneLoader),
 * which flies in the active theme's branding colour, so a slow RTT never
 * leaves a blank <main> and every route loads with the same brand motion.
 *
 * Per-page <Suspense> fallbacks still serve their exact-layout skeletons
 * AFTER the page shell arrives; the two are complementary, never stacked.
 */
export default function PublicLoading() {
  return <PlaneLoader label="Loading page" className="min-h-[52vh]" />;
}
