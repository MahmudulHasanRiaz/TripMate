import Link from "next/link";

import { getSiteSettings } from "@/lib/site-settings";
import { SkipLink } from "@/components/site/SkipLink";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

/**
 * Root not-found — the fallback for ANY unmatched URL (visitor-facing or an
 * admin/auth typo). It renders the full public chrome so a 404 never feels
 * like a broken, unstyled dead end, and mirrors the (public) layout structure
 * (SkipLink → header → <main id="main"> → footer) so the skip-link target and
 * landmarks behave identically on error pages.
 */
export default async function NotFound() {
  const site = await getSiteSettings();

  return (
    <>
      <SkipLink />
      <SiteHeader title={site.title} logoUrl={site.logoUrl} />
      <main
        id="main"
        tabIndex={-1}
        className="flex min-h-[70vh] items-center justify-center px-4 py-24 outline-none"
      >
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            404
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            This page wandered off the itinerary.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The link may be old, or the page may have moved. Let&apos;s get you
            back to the journey.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter
        title={site.title}
        logoUrl={site.logoUrl}
        phone={site.phone}
        email={site.email}
        address={site.address}
      />
    </>
  );
}
