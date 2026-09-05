import Link from "next/link";
import type { Route } from "next";
import {
  Compass,
  ExternalLink,
  FileCheck,
  HeartPulse,
  Moon,
  MoonStar,
  PlaneTakeoff,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ServiceGridItem = {
  /** Stable catalog identity — React list key. Never the href: two redirect
      categories can share a URL, which would duplicate keys. */
  slug: string;
  /** Destination for the card: /services/{slug} or, for redirect kinds, the external URL. */
  href: string;
  /** True for redirect kinds -> opens externally in a new tab with the external marker. */
  external?: boolean;
  /** lucide icon name stored on the category (seed: compass, moon-star, moon, …). */
  icon: string | null;
  name: string;
  /** One-line customer-facing promise (v1: derived from the category kind). */
  blurb: string;
};

/**
 * Catalog icons are stored as strings (service_categories.icon). Map the known
 * seed values to lucide components; anything unrecognised falls back to Compass
 * rather than crashing on an unknown import. Extend this map as the catalog
 * gains categories.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  compass: Compass,
  "moon-star": MoonStar,
  moon: Moon,
  "heart-pulse": HeartPulse,
  "plane-takeoff": PlaneTakeoff,
  "file-check": FileCheck,
};

function ServiceIcon({ name }: { name: string | null }) {
  const Icon = (name && ICON_MAP[name]) || Compass;
  return <Icon className="size-6" aria-hidden="true" />;
}

/**
 * The 6 (or N) service-category tiles (spec §3 ServiceGrid): icon in a
 * primary-tinted disc, name, one-line promise. The whole tile is a link —
 * internal to /services/{slug} or external (new tab + external icon) for
 * redirect kinds. Server-rendered; no client JS per tile. Section chrome
 * (background + SectionHeading) is owned by the page so this stays reusable.
 */
export function ServiceGrid({ items }: { items: ServiceGridItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const nameId = `service-${item.name.toLowerCase().replace(/\s+/g, "-")}`;
        const inner = (
          <>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ServiceIcon name={item.icon} />
            </span>
            <span className="flex flex-1 flex-col">
              <span
                id={nameId}
                className="font-display text-xl font-semibold leading-snug tracking-tight"
              >
                {item.name}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.blurb}
              </span>
            </span>
            {item.external ? (
              <ExternalLink
                className="size-4 shrink-0 self-start text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            ) : null}
          </>
        );

        const cardClass = cn(
          "group flex h-full items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-sm transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:shadow-lg",
        );

        return (
          <li key={item.slug} className="h-full">
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-labelledby={nameId}
                className={cardClass}
              >
                {inner}
              </a>
            ) : (
              <Link
                href={item.href as Route}
                aria-labelledby={nameId}
                className={cardClass}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
