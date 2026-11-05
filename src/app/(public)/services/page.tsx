import type { Metadata } from "next";

import { listCategories } from "@/modules/catalog/service";
import type { ServiceKind } from "@/modules/catalog/validation";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { usableRedirectUrl } from "@/lib/redirect-url";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ServiceGrid, type ServiceGridItem } from "@/components/site/ServiceGrid";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  const brand = site.title?.trim() || "the agency";
  return {
    title: "Services",
    description: `Every service ${brand} offers — Hajj and Umrah, holidays, medical travel, flights and visas, handled end to end.`,
  };
}

/** One-line customer-facing promise per category kind (mirrors the home page). */
const SERVICE_KIND_BLURB: Record<ServiceKind, string> = {
  package: "Curated packages with transparent, published pricing.",
  inquiry_based: "Tell us your plan — we'll craft a personalised quote.",
  redirect: "Book direct online.",
};

function toServiceItem(category: {
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
  icon: string | null;
}): ServiceGridItem {
  const usable = usableRedirectUrl(category.redirectUrl);
  const external = category.kind === "redirect" && Boolean(usable);
  return {
    href: external ? (usable as string) : `/services/${category.slug}`,
    slug: category.slug,
    external,
    icon: category.icon,
    name: category.name,
    blurb: SERVICE_KIND_BLURB[category.kind],
  };
}

/**
 * Services index — /services (FU-28). The route did not exist: the home
 * page's service cards and several CTAs pointed here and visitors hit
 * the 404 page. It lists every active service category with the same
 * card grid the home page uses, so the two can never drift apart in
 * behaviour (external redirect only when a usable URL is configured).
 */
export default async function ServicesIndexPage() {
  const categories = await listCategories(true);
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
      <header className="max-w-2xl">
        <SectionHeading
          kicker="What we do"
          title="Every journey, planned with care"
          lead="Hajj and Umrah, holidays, medical travel, flights and visas — handled end to end by one trusted agency."
        />
      </header>
      <div className="mt-12">
        <ServiceGrid items={categories.map(toServiceItem)} />
      </div>
    </div>
  );
}
