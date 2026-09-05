import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { Clock, MapPin, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTaka } from "./currency";

type PackageCardProps = {
  href: string;
  title: string;
  destination: string;
  imageSrc: string;
  imageAlt: string;
  durationDays: number;
  rating?: number;
  /** Whole-taka price (catalog stores 145000 = ৳1,45,000). */
  price: number;
};

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Package listing card (spec §3). The whole card is one link; image is the
 * entry point with an editorial 4:3 crop, meta stays quiet. Hover = lift + a
 * 1.02 image scale only. Server-rendered; no client JS per card.
 */
export function PackageCard({
  href,
  title,
  destination,
  imageSrc,
  imageAlt,
  durationDays,
  rating,
  price,
}: PackageCardProps) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "group block overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 ease-out-quint",
        "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover transition-transform duration-300 ease-out-quint group-hover:scale-[1.02]"
          />
        ) : (
          <span className="sr-only">{imageAlt}</span>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur-sm">
          <MapPin className="size-3.5 text-primary" aria-hidden="true" />
          {destination}
        </span>
      </div>

      <div className="space-y-3 p-5">
        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight">
          {title}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            {durationDays} {durationDays === 1 ? "day" : "days"}
          </span>
          {typeof rating === "number" ? (
            <span className="inline-flex items-center gap-1.5">
              <Star
                className="size-4 fill-accent text-accent"
                aria-hidden="true"
              />
              <span className="font-medium text-accent-text">{rating.toFixed(1)}</span>
            </span>
          ) : null}
        </div>
        <p className="pt-1 text-sm">
          <span className="text-muted-foreground">From </span>
          <span className="font-semibold text-foreground">{formatTaka(price)}</span>
        </p>
      </div>
    </Link>
  );
}
