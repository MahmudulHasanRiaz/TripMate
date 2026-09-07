import type { Metadata } from "next";

import { getSiteSettings } from "@/lib/site-settings";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { SkipLink } from "@/components/site/SkipLink";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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
  const site = await getSiteSettings();

  return (
    <>
      <SkipLink />
      <SiteHeader title={site.title} logoUrl={site.logoUrl} />
      {/* tabIndex=-1 makes main a valid skip-link target; outline-none keeps
          the whole-page focus target from drawing a giant focus ring. */}
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
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
