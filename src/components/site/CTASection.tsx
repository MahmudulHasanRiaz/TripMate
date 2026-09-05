import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { MessageCircle, Phone } from "lucide-react";

import { telLink, whatsappLink } from "./currency";

type CTASectionProps = {
  headline: ReactNode;
  sub?: ReactNode;
  ctaLabel: string;
  ctaHref: string;
  /** Bengali-market closing sections must offer a phone (and WhatsApp) path. */
  phone?: string;
  whatsapp?: boolean;
};

/**
 * Closing conversion band used at the bottom of public pages (spec §3
 * CTASection + §2.1 "one primary CTA per viewport"). The band carries exactly
 * one primary action; the phone + WhatsApp links are quiet, non-competing
 * escapes for the market's preferred contact channels.
 */
export function CTASection({
  headline,
  sub,
  ctaLabel,
  ctaHref,
  phone,
  whatsapp = true,
}: CTASectionProps) {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 lg:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {headline}
          </h2>
          {sub ? (
            <p className="max-w-xl text-lg leading-relaxed text-primary-foreground/85">
              {sub}
            </p>
          ) : null}
          <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href={ctaHref as Route}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary-foreground px-8 text-sm font-semibold text-primary transition-colors hover:opacity-90"
            >
              {ctaLabel}
            </Link>
            {phone ? (
              <span className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <a
                  href={telLink(phone)}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  <span dir="ltr">{phone}</span>
                </a>
                {whatsapp ? (
                  <a
                    href={whatsappLink(phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    WhatsApp us
                  </a>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
