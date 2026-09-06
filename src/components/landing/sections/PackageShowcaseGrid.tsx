import type {
  LandingListingCard,
  ResolvedPackageShowcaseConfig,
} from "@/modules/landing-pages/service";
import type { PackageShowcaseConfig } from "@/modules/landing-pages/section-types";
import { PackageCard } from "@/components/site/PackageCard";
import { SectionHeading } from "@/components/site/SectionHeading";

type PackageShowcaseGridProps = {
  config: PackageShowcaseConfig | ResolvedPackageShowcaseConfig;
};

export function PackageShowcaseGrid({ config }: PackageShowcaseGridProps) {
  const listings: LandingListingCard[] =
    "listings" in config && Array.isArray(config.listings)
      ? config.listings
      : [];

  if (listings.length === 0) {
    return (
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Featured Packages"
            title="Featured travel packages"
            align="center"
            className="mb-8"
          />
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No packages currently selected or published.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Featured Packages"
          title="Curated journeys designed for you"
          align="center"
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((pkg) => (
            <PackageCard
              key={pkg.id}
              href={`/packages/${pkg.slug}`}
              title={pkg.title}
              destination={pkg.destinationName || "Tour"}
              imageSrc={pkg.coverImage?.url || ""}
              imageAlt={pkg.coverImage?.alt || pkg.title}
              durationDays={pkg.durationDays}
              price={pkg.price}
              currency={pkg.currency || "BDT"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
