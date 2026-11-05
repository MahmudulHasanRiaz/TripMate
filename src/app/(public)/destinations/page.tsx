import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, MapPin } from "lucide-react";

import { listDestinationsWithStats } from "@/modules/catalog/service";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { formatMoney } from "@/components/site/currency";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  const brand = site.title?.trim() || "the agency";
  return {
    title: "Destinations",
    description: `Explore the destinations ${brand} travels to — packages, itineraries and visa guidance for each.`,
  };
}

/**
 * Destinations index — /destinations (FU-28). The route did not exist:
 * the home page's "Explore all destinations" CTA pointed at /packages
 * and there was no page listing every destination. Cards mirror the
 * home PopularDestinations card (same data, same stats line) and link
 * to each destination's own page.
 */
export default async function DestinationsIndexPage() {
  const destinations = await listDestinationsWithStats(true);
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
      <header className="max-w-2xl">
        <SectionHeading
          kicker="Where we go"
          title="Destinations"
          lead="From the spiritual heart of Makkah and Madinah to the architectural wonders of Dubai and the pristine coral atolls of the Maldives."
        />
      </header>

      {destinations.length > 0 ? (
        <div className="mt-12 flex flex-wrap justify-center gap-5">
          {destinations.map((dest, index) => (
            <Reveal
              key={dest.id}
              delay={index * 80}
              className="h-full w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)]"
            >
              <Link
                href={`/destinations/${dest.slug}` as Route}
                className="group relative block h-full overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-muted">
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      referrerPolicy="no-referrer"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <MapPin className="size-8 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-accent">
                      <MapPin className="size-3" />
                      <span>{dest.isFeatured ? "Premier Destination" : "Curated Guide"}</span>
                    </div>
                    <h3 className="mt-1 font-display text-xl font-bold text-white transition-colors group-hover:text-amber-200">
                      {dest.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-white/90">
                      <span className="font-medium tabular-nums">
                        {dest.packageCount > 0
                          ? `${dest.packageCount} ${dest.packageCount === 1 ? "Package" : "Packages"}${
                              dest.startingPrice ? ` · From ${formatMoney(dest.startingPrice)}` : ""
                            }`
                          : "Explore itineraries"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-accent transition-transform group-hover:translate-x-1">
                        View <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-12 text-sm text-muted-foreground">
          Destinations are being added — please check back soon, or browse all packages.
        </p>
      )}
    </div>
  );
}
