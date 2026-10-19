import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, CalendarClock, Images, MapPin, Sparkles, Star } from "lucide-react";

import type { PackageDetailData } from "../../_lib/catalog-data";

/**
 * Package detail hero — full-width cover with a title card over a scrim
 * (spec §3 PackageDetailLayout "hero"). Category + destination chips deep-link
 * into the index's filters (`?cat=` / `?dest=`); no cover configured falls
 * back to a quiet gradient band so a listing without imagery never renders a
 * broken image. Everything here is driven by the listing row: the "Featured"
 * badge and the "+N photos" jump pill appear only when the data says so.
 */
export function PackageHero({ data }: { data: PackageDetailData }) {
  const cover = data.cover;
  const hasCover = Boolean(cover?.url);
  const photoCount = data.gallery.length + (cover?.url ? 1 : 0);

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-muted/40" aria-hidden="true" />
      )}

      <div className="relative z-10 mx-auto flex min-h-[24rem] w-full max-w-[1400px] flex-col justify-end px-4 pb-12 pt-14 lg:min-h-[30rem] lg:px-8 lg:pb-16 lg:pt-16">
        <Link
          href="/packages"
          className={`mb-auto inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
            hasCover
              ? "-ml-3 text-white/85 hover:bg-white/10 hover:text-white"
              : "-ml-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All packages
        </Link>

        <div className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            {data.isFeatured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Featured
              </span>
            ) : null}
            <Link
              href={`/packages?cat=${data.category.slug}` as Route}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1 text-xs font-semibold backdrop-blur-sm transition-colors ${
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
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 py-1 text-xs font-medium backdrop-blur-sm transition-colors ${
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
            className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm ${
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
                <span
                  className={`font-medium tabular-nums ${hasCover ? "text-accent" : "text-accent-text"}`}
                >
                  {data.rating.toFixed(1)}
                  <span className={hasCover ? "text-white/70" : "text-muted-foreground"}>
                    {" "}
                    / 5
                  </span>
                </span>
              </span>
            ) : null}
            {photoCount > 0 ? (
              <a
                href="#package-gallery"
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 -mx-3 transition-colors ${
                  hasCover
                    ? "text-white/85 hover:bg-white/10 hover:text-white"
                    : "hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Images className="size-4 text-accent" aria-hidden="true" />
                {photoCount} {photoCount === 1 ? "photo" : "photos"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
