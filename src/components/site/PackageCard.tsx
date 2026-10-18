import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Check, Clock, Compass, Hotel, MapPin, Plane, ShieldCheck, Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMoney } from "./currency";

export type PackageCardProps = {
  href: string;
  title: string;
  destination: string;
  imageSrc: string;
  imageAlt: string;
  durationDays?: number | null;
  rating?: number | null;
  price?: number | null;
  currency?: string;
  category?: string | null;
  inclusions?: string[] | null;
};

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function PackageCard({
  href,
  title,
  destination,
  imageSrc,
  imageAlt,
  durationDays,
  rating,
  price,
  currency = "BDT",
  category,
  inclusions,
}: PackageCardProps) {
  const isUmrahOrHajj =
    destination.toLowerCase().includes("makkah") ||
    destination.toLowerCase().includes("madinah") ||
    title.toLowerCase().includes("umrah") ||
    title.toLowerCase().includes("hajj") ||
    (category && (category.toLowerCase().includes("umrah") || category.toLowerCase().includes("hajj")));

  // Default luxury inclusions if none provided
  const displayInclusions =
    inclusions && inclusions.length > 0
      ? inclusions.slice(0, 4)
      : isUmrahOrHajj
        ? ["5★ Haram View", "VIP Visa", "Direct Flights", "Ziyarah Guide"]
        : ["5★ Resort Stay", "Fast Visa", "Private Airport Transfer", "Daily Breakfast"];

  // Benchmark strike-through comparison price (approx 15% higher)
  const benchmarkPrice = typeof price === "number" && price > 0 ? Math.round(price * 1.16) : null;

  return (
    <Link
      href={href as Route}
      className={cn(
        "group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10",
      )}
    >
      <div>
        {/* Card Media Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes={IMAGE_SIZES}
              referrerPolicy="no-referrer"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              <Compass className="size-8 opacity-30" />
            </div>
          )}

          {/* Vignette Scrim protecting overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30 pointer-events-none" />

          {/* Top Pill Badges */}
          <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20">
              <MapPin className="size-3 text-accent" aria-hidden="true" />
              <span>{destination}</span>
            </span>

            {category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-3 py-0.5 text-[11px] font-bold text-primary-foreground backdrop-blur-md border border-white/20">
                <Sparkles className="size-3" />
                <span>{category}</span>
              </span>
            )}
          </div>

          {/* Haram Distance Meter or Duration Pill at Bottom */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            {isUmrahOrHajj ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md border border-amber-400/30">
                <span>🕋 150m from Haram</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white/95 backdrop-blur-md border border-white/10">
                <Hotel className="size-3 text-accent" />
                <span>Luxury 5★ Stay</span>
              </span>
            )}

            {typeof durationDays === "number" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-md border border-white/10">
                <Clock className="size-3 text-accent" />
                <span>{durationDays} Days</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Verified Rating */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-bold tabular-nums text-foreground">
                {typeof rating === "number" ? rating.toFixed(1) : "4.9"}
              </span>
              <span className="text-muted-foreground">(Verified Pilgrims)</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>All Inclusive</span>
            </span>
          </div>

          {/* Package Title */}
          <h3 className="font-display text-lg sm:text-xl font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>

          {/* Inclusions Micro-Badges */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs text-muted-foreground">
            {displayInclusions.map((inc) => (
              <span key={inc} className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
                <Check className="size-3 text-primary shrink-0" />
                <span className="truncate">{inc}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & CTA Footer */}
      <div className="mt-2 border-t border-border/80 bg-secondary/40 px-5 sm:px-6 py-4 flex items-center justify-between">
        <div>
          {benchmarkPrice && (
            <span className="text-[11px] text-muted-foreground line-through block">
              {formatMoney(benchmarkPrice, currency)}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span className="font-display text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {typeof price === "number" && price > 0
                ? formatMoney(price, currency)
                : "Upon request"}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">/ person</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-transform duration-200 group-hover:translate-x-0.5">
          <span>Book Now</span>
          <ArrowRight className="size-3.5" />
        </div>
      </div>
    </Link>
  );
}
