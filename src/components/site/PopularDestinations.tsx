import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Destination } from "@/modules/catalog/service";

export type PopularDestinationsProps = {
  destinations: Destination[];
};

export function PopularDestinations({ destinations }: PopularDestinationsProps) {
  if (destinations.length === 0) return null;

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Top Destinations
            </span>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Where will your journey take you?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              From the sacred sanctuaries of Makkah to the futuristic skyline of Dubai and tropical coral atolls of the Maldives.
            </p>
          </div>
          <Link
            href="/packages"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <span>All 40+ destinations</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.slice(0, 6).map((dest) => (
            <Link
              key={dest.id}
              href={`/packages?destination=${dest.slug}`}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {dest.image ? (
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <MapPin className="size-10 opacity-40" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-1.5 text-xs text-white/80">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Featured Destination</span>
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold text-white group-hover:text-primary transition-colors">
                    {dest.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/90">
                    <span className="font-medium">Curated Packages &amp; Visas</span>
                    <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                      Explore <ArrowRight className="size-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
