import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, MessageCircle, Phone, Sparkles } from "lucide-react";

import { telLink, whatsappLink } from "./currency";

type CTASectionProps = {
  headline: ReactNode;
  sub?: ReactNode;
  ctaLabel: string;
  ctaHref: string;
  phone?: string;
  whatsapp?: boolean;
  /** Eyebrow line above the headline — defaults to a brand-aware invite. */
  eyebrow?: ReactNode;
};

export function CTASection({
  headline,
  sub,
  ctaLabel,
  ctaHref,
  phone,
  whatsapp = true,
  eyebrow,
}: CTASectionProps) {
  const telHref = telLink(phone ?? "");
  const waHref = whatsapp ? whatsappLink(phone ?? "") : null;

  return (
    <section className="relative overflow-hidden mx-auto w-full max-w-[1400px] px-4 py-16 sm:py-20 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent px-6 py-14 text-primary-foreground shadow-2xl sm:px-12 sm:py-20 lg:px-16">
        {/* Subtle Islamic / Ambient Starburst Pattern */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-black/15 blur-3xl" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-md">
            <Sparkles className="size-3.5" />
            <span>{eyebrow ?? "Begin Your Spiritual Odyssey"}</span>
          </div>

          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {headline}
          </h2>

          {sub ? (
            <p className="max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base lg:text-lg">
              {sub}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-4">
            <Link
              href={ctaHref as Route}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-bold text-gray-900 shadow-xl transition-all duration-200 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="size-4" />
            </Link>

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageCircle className="size-4" />
                <span>Chat on WhatsApp</span>
              </a>
            ) : null}

            {telHref && phone ? (
              <a
                href={telHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <Phone className="size-4" />
                <span dir="ltr">{phone}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
