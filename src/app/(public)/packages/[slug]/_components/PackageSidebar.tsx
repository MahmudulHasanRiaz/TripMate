import { CalendarClock, Mail, MessageCircle, Phone, Star } from "lucide-react";

import { formatMoney, telLink, whatsappLink } from "@/components/site/currency";

import type { PackageDetailData } from "../../_lib/catalog-data";

type EnquiryTargets = { phone: string; email: string };

/**
 * Enquiry CTAs for a package (spec §3 PackageDetailLayout sidebar).
 *
 * The spec's booking form is deliberately OUT of Task 11 scope — Plan 5 owns
 * it. Until then the conversion path is the market's three preferred channels:
 * a phone call (tel:), WhatsApp, and an email whose subject already carries the
 * package title so an advisor knows what the lead is about. Everything is a
 * plain mailto/tel/wa.me href — no client JS needed.
 */

function priceLine(data: PackageDetailData) {
  return typeof data.price === "number"
    ? { price: formatMoney(data.price, data.currency) }
    : null;
}

function mailtoEnquiry(email: string, title: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(`Enquiry: ${title}`)}`;
}

/** Full desktop / in-grid sticky card. */
export function PackageEnquiryCard({
  data,
  phone,
  email,
}: {
  data: PackageDetailData;
} & EnquiryTargets) {
  const hasPrice = typeof data.price === "number";
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {hasPrice ? "From" : "Enquiry"}
      </p>
      {hasPrice ? (
        <p
          data-testid="package-price"
          className="mt-1 font-display text-3xl font-semibold tracking-tight"
        >
          {formatMoney(data.price as number, data.currency)}
        </p>
      ) : (
        <p data-testid="package-price" className="mt-1 font-display text-2xl font-semibold">
          Price on request
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        {hasPrice ? "per person" : "Tell us your dates for a quote"}
      </p>

      <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="ml-auto font-medium">
            {typeof data.durationDays === "number"
              ? `${data.durationDays} ${data.durationDays === 1 ? "day" : "days"}`
              : "Flexible"}
          </dd>
        </div>
        {typeof data.rating === "number" ? (
          <div className="flex items-center gap-2.5">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            <dt className="text-muted-foreground">Rating</dt>
            <dd className="ml-auto font-medium text-accent-text">
              {data.rating.toFixed(1)} / 5
            </dd>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <span className="size-4 rounded-full bg-secondary" aria-hidden="true" />
          <dt className="text-muted-foreground">Type</dt>
          <dd className="ml-auto font-medium">{data.category.name}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-2.5">
        <a
          href={telLink(phone)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Phone className="size-4" aria-hidden="true" />
          <span dir="ltr">{phone}</span>
        </a>
        <a
          href={whatsappLink(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <MessageCircle className="size-4 text-primary" aria-hidden="true" />
          Chat on WhatsApp
        </a>
        <a
          href={mailtoEnquiry(email, data.title)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <Mail className="size-4 text-primary" aria-hidden="true" />
          Enquire by email
        </a>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        No online payment — enquire and an advisor confirms your dates before
        booking.
      </p>
    </div>
  );
}

/** Compact fixed bar for <lg viewports (the card moves into the sticky column above lg). */
export function PackageMobileBar({
  data,
  phone,
  email,
}: {
  data: PackageDetailData;
} & EnquiryTargets) {
  const price = priceLine(data);
  return (
    <div
      role="region"
      aria-label="Enquire about this package"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {price ? (
            <p className="truncate text-sm">
              <span className="text-muted-foreground">From </span>
              <span className="font-semibold">{price.price}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold">Price on request</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {typeof data.durationDays === "number"
              ? `${data.durationDays} ${data.durationDays === 1 ? "day" : "days"}`
              : "Flexible duration"}
            {data.destination ? ` · ${data.destination.name}` : ` · ${data.category.name}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={telLink(phone)}
            aria-label={`Call ${phone}`}
            className="inline-flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Phone className="size-5" aria-hidden="true" />
          </a>
          <a
            href={whatsappLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-secondary"
          >
            <MessageCircle className="size-5 text-primary" aria-hidden="true" />
          </a>
          <a
            href={mailtoEnquiry(email, data.title)}
            aria-label="Enquire by email"
            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-secondary"
          >
            <Mail className="size-5 text-primary" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
