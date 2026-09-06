import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import type { HeroConfig } from "@/modules/landing-pages/section-types";
import { Button } from "@/components/ui/button";

type HeroSectionProps = {
  config: HeroConfig;
};

/**
 * Editorial Hero Section (spec §4 & design direction).
 * Features display serif typography, minimal-luxury aesthetic, optional background
 * imagery with a dark scrim keeping AA contrast (spec §2.5), and one dominant CTA.
 */
export function HeroSection({ config }: HeroSectionProps) {
  const hasImage = Boolean(config.imageUrl?.trim());
  const hasCta = Boolean(config.ctaLabel?.trim() && config.ctaHref?.trim());

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      {hasImage ? (
        <>
          <Image
            src={config.imageUrl!}
            alt={config.headline}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Subtle vignette + 55% dark scrim to guarantee AA contrast */}
          <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-radial-[circle_at_top] from-secondary/60 via-background to-background" />
      )}

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
          {config.headline}
        </h1>

        {config.sub?.trim() ? (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl text-balance">
            {config.sub}
          </p>
        ) : null}

        {hasCta ? (
          <div className="mt-8 flex items-center justify-center gap-4 sm:mt-10">
            <Button
              asChild
              size="lg"
              className="h-12 min-h-[44px] px-8 text-base font-semibold shadow-sm transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Link href={config.ctaHref! as Route}>
                {config.ctaLabel}
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
