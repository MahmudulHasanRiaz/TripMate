import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeroSectionProps = {
  headline?: string;
  sub?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string | null;
  imageAlt?: string;
};

/**
 * Premium Luxury Hero Section.
 * Renders atmospheric background photography, elegant ambient glow,
 * two-tone typography, and primary conversion action.
 *
 * Sits seamlessly above the interactive TravelActionPanel.
 */
export function HeroSection({
  headline = "Travel better. We'll handle the rest.",
  sub = "Spiritual pilgrimages, family holidays, and corporate travel — planned with precision, transparency, and 24/7 human care.",
  ctaLabel = "Explore Packages",
  ctaHref = "/packages",
  imageSrc,
  imageAlt = "Luxury travel landscape",
}: HeroSectionProps) {
  // Two-tone typography formatter: italic accent on second half if split by punctuation
  const renderHeadline = () => {
    if (!headline) return null;
    const splitChar = headline.includes(".") ? "." : headline.includes(",") ? "," : null;
    if (splitChar) {
      const parts = headline.split(splitChar);
      const first = parts[0];
      const second = parts.slice(1).join(splitChar);
      if (second.trim()) {
        return (
          <>
            <span className="block text-foreground">{first.trim()}{splitChar === "." ? "." : ","}</span>
            <span className="block font-serif italic font-normal tracking-normal text-accent dark:text-amber-300">
              {second.trim()}
            </span>
          </>
        );
      }
    }
    return <span className="text-foreground">{headline}</span>;
  };

  return (
    <section className="relative isolate overflow-hidden -mt-20 sm:-mt-24 pt-32 sm:pt-40 pb-20 sm:pb-28 lg:pb-32 transition-colors">
      {/* Background: Atmospheric Photograph extending to top */}
      {imageSrc ? (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover opacity-35 dark:opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background dark:from-slate-950/90 dark:via-slate-950/75 dark:to-slate-950" />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 bg-background dark:bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background dark:from-slate-950 dark:via-slate-950/95 dark:to-slate-950" />
          <div className="absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-[130px]" />
          <div className="absolute left-1/4 top-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[140px]" />
        </div>
      )}

      {/* Ambient Radial Glow Orbs */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/15 blur-[140px] -z-10" />
      <div className="pointer-events-none absolute top-48 right-1/4 size-[400px] rounded-full bg-accent/15 blur-[140px] -z-10" />

      <div className="relative mx-auto flex w-full max-w-[1340px] flex-col items-center px-4 sm:px-6 lg:px-8 text-center">
        {/* Floating Trust Eyebrow Pill */}
        <div className="mb-6 inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-border/80 bg-card/85 dark:bg-slate-900/85 px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-amber-500 dark:text-amber-300 font-bold">
            <Sparkles className="inline-block size-3.5 mr-1 align-text-bottom" />
            Bespoke Travel &amp; Pilgrimage Specialist
          </span>
          <span className="opacity-30">•</span>
          <span className="text-muted-foreground hidden sm:inline">24/7 Human Concierge Desk</span>
          <span className="text-muted-foreground sm:hidden">24/7 Care</span>
        </div>

        {/* Hero Headline */}
        <h1 className="max-w-4xl text-balance font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight drop-shadow-xs">
          {renderHeadline()}
        </h1>

        {/* Supporting Copy */}
        {sub ? (
          <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            {sub}
          </p>
        ) : null}

        {/* Primary CTA */}
        {ctaLabel && ctaHref ? (
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href={ctaHref as Route}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl",
                "bg-primary px-8 text-sm font-bold text-primary-foreground shadow-lg",
                "transition-all duration-200 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]",
              )}
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
