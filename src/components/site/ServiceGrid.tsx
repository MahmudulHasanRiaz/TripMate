import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Crown,
  ExternalLink,
  FileText,
  Heart,
  Moon,
  Plane,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";

export type ServiceGridItem = {
  slug: string;
  href: string;
  external?: boolean;
  icon?: string | null;
  name: string;
  blurb: string;
  features?: string[];
};

// Curated luxury icons based on service slug/name
function resolveServiceIcon(slug: string, name: string) {
  const s = (slug + " " + name).toLowerCase();
  if (s.includes("umrah")) return <Crown className="size-5 text-accent" />;
  if (s.includes("hajj")) return <Moon className="size-5 text-primary" />;
  if (s.includes("family") || s.includes("holiday") || s.includes("tour"))
    return <Heart className="size-5 text-accent" />;
  if (s.includes("visa")) return <FileText className="size-5 text-primary" />;
  if (s.includes("flight") || s.includes("air")) return <Plane className="size-5 text-accent" />;
  if (s.includes("medic") || s.includes("health"))
    return <Activity className="size-5 text-primary" />;
  return <Sparkles className="size-5 text-primary" />;
}

export function ServiceGrid({ items }: { items: ServiceGridItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => {
        const isFeatured = idx === 0 || item.slug.includes("umrah") || item.slug.includes("hajj");

        const cardContent = (
          <div
            className={cn(
              "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-6 sm:p-7 backdrop-blur-md transition-all duration-300",
              "border-border/80 bg-card/90 hover:border-primary/50 hover:bg-card hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5",
              isFeatured && "ring-1 ring-primary/20",
            )}
          >
            {/* Top subtle ambient glow on hover */}
            <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-xl transition-opacity group-hover:opacity-100 opacity-20" />

            <div>
              {/* Header: Icon Container + Category tag */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-secondary/80 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                  {resolveServiceIcon(item.slug, item.name)}
                </div>
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">
                    <Sparkles className="size-3" />
                    <span>Featured Service</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {item.name}
              </h3>

              {/* Description */}
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                {item.blurb}
              </p>

              {/* Feature Bullets (only when provided) */}
              {item.features && item.features.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-border/50 pt-3.5 text-xs text-foreground/80">
                  {item.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Action Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-semibold text-primary">
              <span className="transition-colors group-hover:underline">
                Explore Service
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:translate-x-1">
                {item.external ? (
                  <ExternalLink className="size-3.5" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
              </div>
            </div>
          </div>
        );

        if (item.external) {
          return (
            <Reveal key={item.slug} delay={idx * 80} className="block h-full">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                {cardContent}
              </a>
            </Reveal>
          );
        }

        return (
          <Reveal key={item.slug} delay={idx * 80} className="block h-full">
            <Link href={item.href as Route} className="block h-full">
              {cardContent}
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
