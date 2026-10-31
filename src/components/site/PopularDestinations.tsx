import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, MapPin } from "lucide-react";
import type { DestinationWithStats } from "@/modules/catalog/service";
import { formatMoney } from "@/components/site/currency";
import { Reveal } from "@/components/site/Reveal";

export type PopularDestinationsProps = {
  destinations: DestinationWithStats[];
};

export function PopularDestinations({ destinations }: PopularDestinationsProps) {
  if (destinations.length === 0) return null;

  // Prioritize featured destinations, fallback to active
  const featured = destinations.filter((d) => d.isFeatured);
  const displayDestinations = (featured.length > 0 ? featured : destinations).slice(0, 6);

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Handpicked Portfolios
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Sacred Sanctuaries &amp; Global Havens
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              From the spiritual heart of Makkah and Madinah to the architectural wonders of Dubai and pristine coral atolls of the Maldives.
            </p>
          </div>
          <Link
            href="/packages"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
          >
            <span>Explore all destinations</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {displayDestinations.map((dest, index) => {
            const isMarquee = index === 0;
            return (
              <Reveal key={dest.id} delay={index * 80} className="h-full w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)]">
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

                  {/* Scrim Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                  {/* Content Over Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-accent">
                      <MapPin className="size-3" />
                      <span>{isMarquee ? "Premier Destination" : "Curated Guide"}</span>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
