import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, CalendarClock, MapPin, Star } from "lucide-react";

import type { PackageDetailData } from "../../_lib/catalog-data";

/**
 * Package detail hero — full-width cover with a title card over a scrim
 * (spec §3 PackageDetailLayout "hero"). Category + destination chips deep-link
 * into the index's filters (`?cat=` / `?dest=`); no cover configured falls
 * back to a quiet gradient band so a listing without imagery never renders a
 * broken image.
 */
export function PackageHero({ data }: { data: PackageDetailData }) {
  const cover = data.cover;
  const hasCover = Boolean(cover?.url);

  return (
    <section
      className={`relative isolate overflow-hidden ${
        hasCover ? "" : "bg-gradient-to-br from-primary/10 via-secondary to-background"
      }`}
    >
      {cover ? (
        <>
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted/40" aria-hidden="true" />
      )}

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-10 pt-12 lg:px-8 lg:pb-14 lg:pt-16">
        <Link
          href="/packages"
          className={`mb-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline ${
            hasCover ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All packages
        </Link>

        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/packages?cat=${data.category.slug}` as Route}
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm transition-colors ${
                hasCover
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              }`}
            >
              <span
                className="size-1.5 rounded-full bg-accent"
                aria-hidden="true"
              />
              {data.category.name}
            </Link>
            {data.destination ? (
              <Link
                href={`/packages?dest=${data.destination.slug}` as Route}
                className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors ${
                  hasCover
                    ? "border-white/25 bg-white/10 text-white/90 hover:bg-white/20"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {data.destination.name}
              </Link>
            ) : null}
          </div>

          <h1
            className={`mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl ${
              hasCover ? "text-white drop-shadow-sm" : "text-foreground"
            }`}
          >
            {data.title}
          </h1>

          <div
            className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${
              hasCover ? "text-white/90" : "text-muted-foreground"
            }`}
          >
            {typeof data.durationDays === "number" ? (
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="size-4 text-accent" aria-hidden="true" />
                {data.durationDays} {data.durationDays === 1 ? "day" : "days"}
              </span>
            ) : null}
            {typeof data.rating === "number" ? (
              <span className="inline-flex items-center gap-2">
                <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
                <span className="font-medium text-accent-text">{data.rating.toFixed(1)} / 5</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
