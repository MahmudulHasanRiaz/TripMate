import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

type HeroSectionProps = {
  /** Marketing headline — rendered as the page's single h1. */
  headline: string;
  /** Quiet supporting line under the headline. */
  sub?: string;
  /** Label for the hero's single primary CTA. */
  ctaLabel: string;
  /** Internal destination for the primary CTA (e.g. /packages). */
  ctaHref: string;
  /**
   * Settings-driven background photograph. Omit / empty -> a branded, neutral
   * fallback backdrop is drawn instead (spec §2.5: hero templates default to a
   * non-sacred generic scene when a headline sits directly on the imagery). A
   * local agency upload lives under /uploads and needs no remotePatterns entry.
   */
  imageSrc?: string | null;
  /** Alt for the background photo — decorative by default (the h1 carries it). */
  imageAlt?: string;
};

const IMAGE_SIZES = "100vw";

/**
 * Full-bleed marketing hero (spec §3 HeroSection, §2.5 Imagery). Text sits on a
 * localized left-to-right scrim (>=40% dark behind the copy) so white headline
 * type keeps WCAG AA contrast over any photograph, in BOTH themes — the hero is
 * a photo-like context, so it uses explicit white for text rather than the
 * theme-flipped foreground tokens. The single primary CTA stays token-correct
 * (`bg-primary`) and is the page's only primary action in this viewport (§2.1).
 *
 * The SiteHeader is solid and sticky in the (public) layout — this hero sits
 * below it in normal flow rather than mounting overHero-transparent. Simpler
 * and robust; noted as polish in Task 10.
 */
export function HeroSection({
  headline,
  sub,
  ctaLabel,
  ctaHref,
  imageSrc,
  imageAlt = "",
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      {/* Backdrop: photograph (when settings provide one) or a neutral branded
          scene the copy can sit on. */}
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes={IMAGE_SIZES}
          className="object-cover"
        />
      ) : (
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
          <div className="absolute -right-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
        </div>
      )}

      {/* Localized scrim keeps headline contrast wherever the copy column sits
          (sacred-imagery rule: >=40% dark behind text). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/10"
      />

      <div className="relative mx-auto flex min-h-[60vh] w-full max-w-[1400px] flex-col justify-center px-4 py-24 md:min-h-[80vh] lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Hajj &amp; Umrah · Tours · Flights · Visa
          </p>
          <h1 className="text-balance font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-tight text-white">
            {headline}
          </h1>
          {sub ? (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
              {sub}
            </p>
          ) : null}
          <div className="mt-10">
            <Link
              href={ctaHref as Route}
              className={cn(
                "inline-flex min-h-12 items-center justify-center rounded-md",
                "bg-primary px-8 text-sm font-semibold text-primary-foreground",
                "transition-opacity duration-150 hover:opacity-90",
              )}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
