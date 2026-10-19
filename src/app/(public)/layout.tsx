import type { Metadata } from "next";

import { getSiteSettings } from "@/lib/site-settings";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { buildThemeCssVariables } from "@/modules/settings/theme";
import { getPublicThemeSettings } from "@/modules/settings/theme-service";
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
      <SiteHeader title={site.title} logoUrl={site.logoUrl} phone={site.phone} />
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
