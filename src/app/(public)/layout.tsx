import type { Metadata } from "next";
import { Suspense } from "react";

import { getSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { buildThemeCssVariables } from "@/modules/settings/theme";
import { getPublicThemeSettings } from "@/modules/settings/theme-service";
import { canAccessAdminPanel, getSession } from "@/lib/auth-helpers";
import { SkipLink } from "@/components/site/SkipLink";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChatWidget } from "@/components/site/ChatWidget";
import { JsonLd } from "@/components/site/JsonLd";

/**
 * Metadata for every public marketing page (Plan 6 T3): when the
 * settings.site searchEngineVisibility flag is off, the whole (public) group
 * carries `noindex, nofollow` — in lockstep with robots.ts (`Disallow: /`)
 * and sitemap.ts (empty). All three read the same cached settings row, so
 * they can never disagree. When the flag is on, `{}` inherits the root
 * layout's metadata unchanged (indexable, default title template).
 *
 * The read goes through the cached typed reader (getPublicSiteSettings —
 * 'use cache' + settings tag) so metadata never forces the group dynamic and
 * an admin save lands in one cache hop.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  if (!site.searchEngineVisibility) {
    return { robots: { index: false, follow: false } };
  }
  return {};
}

/**
 * Public marketing route-group shell. Server-rendered: reads the cached site
 * identity once and hands plain serializable strings to the client SiteHeader
 * island and the server SiteFooter (client components cannot read the DB
 * themselves).
 *
 * Route-change view transitions live in template.tsx (a sibling that
 * re-mounts on every navigation), NOT here: layouts persist across
 * navigations, so enter/exit animations never fire on a layout. The header and
 * footer sit outside that pair, so they stay live and never flash.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, theme] = await Promise.all([
    getSiteSettings(),
    getPublicThemeSettings(),
  ]);

  const themeCss = buildThemeCssVariables(theme);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: site.title,
    telephone: site.phone || undefined,
    email: site.email || undefined,
    address: site.address
      ? {
          "@type": "PostalAddress",
          streetAddress: site.address,
          addressCountry: "BD",
        }
      : undefined,
    logo: site.logoUrl || undefined,
  };

  return (
    <>
      <JsonLd data={orgJsonLd} />
      <style id="tripmate-dynamic-theme">{themeCss}</style>
      <SkipLink />
      {/* SiteHeader's client-side usePathname() suspends on routes whose
          dynamic params are request-time-only (e.g. /packages/[slug] fallback
          slugs — no generateStaticParams), and the session read stops
          prerendering too. The Suspense boundary keeps the shell prerendered
          and lets the header stream in after; the skeleton mirrors the
          floating-island header so nothing jumps. */}
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeaderGate site={site} />
      </Suspense>
      {/* tabIndex=-1 makes main a valid skip-link target; outline-none keeps
          the whole-page focus target from drawing a giant focus ring. */}
      <main id="main" tabIndex={-1} className="outline-none pt-20 sm:pt-24">
        {children}
      </main>
      {/* Rain fan-out chat widget: 100% settings-driven (Admin → Settings →
          Contact Channels). WhatsApp falls back to the main site phone when
          no dedicated number is set; call falls back the same way. Zero
          configured channels → the widget hides itself. */}
      <ChatWidget
        siteName={site.title}
        channels={{
          whatsappNumber: site.whatsappNumber || site.phone,
          whatsappPrefill: site.whatsappPrefill,
          messengerUsername: site.messengerUsername,
          callNumber: site.callNumber || site.phone,
          instagramHandle: site.instagramHandle,
        }}
      />
      <SiteFooter
        title={site.title}
        logoUrl={site.logoUrl}
        phone={site.phone}
        email={site.email}
        address={site.address}
        footerDescription={site.footerDescription}
        footerColumns={site.footerColumns}
        footerSocials={site.footerSocials}
        copyright={site.copyright}
      />
    </>
  );
}

/**
 * Streaming header shell: resolves the session SERVER-side and derives the
 * Admin-button visibility from ADMIN_PANEL_ROLES (canAccessAdminPanel) so the
 * decision lives in guarded server code, not in the client's
 * authClient.useSession() — a stale or flaky client session could otherwise
 * surface the panel entry point to an ordinary customer. Session-dependent
 * flags are passed to the client header as plain booleans.
 */
async function SiteHeaderGate({ site }: { site: SiteSettings }) {
  const session = await getSession();
  return (
    <SiteHeader
      title={site.title}
      logoUrl={site.logoUrl}
      phone={site.phone}
      signedIn={Boolean(session?.user)}
      canAccessAdmin={canAccessAdminPanel(session)}
    />
  );
}

/**
 * Pre-rendered stand-in for the streaming SiteHeader (same fixed-island
 * footprint: %-width + inner paddings + 36px brand chip). aria-hidden — the
 * interactive header replaces it within the same flush.
 */
function SiteHeaderFallback() {
  return (
    <div
      aria-hidden="true"
      className="fixed top-2.5 inset-x-0 mx-auto w-[calc(100%-1.25rem)] sm:top-4 sm:w-[calc(100%-2.5rem)] max-w-6xl z-50 select-none"
    >
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/90 py-2.5 pl-3 pr-3 shadow-lg shadow-black/5 sm:py-3 sm:pl-5 sm:pr-3 dark:bg-card/85">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="size-9 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden lg:flex items-center gap-1">
          <div className="h-5 w-14 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden h-8 w-20 animate-pulse rounded-xl bg-muted/70 sm:block" />
          <div className="size-9 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
