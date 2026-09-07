import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  ShoppingBag,
} from "lucide-react";

import { getSiteSettings } from "@/lib/site-settings";
import { PackageCard } from "@/components/site/PackageCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { CTASection } from "@/components/site/CTASection";
import { telLink, whatsappLink } from "@/components/site/currency";

import { getServicePageData, type ServicePageData } from "../_lib/service-data";
import { ServiceHero } from "./_components/ServiceHero";
import { ServiceOptionsSelector } from "./_components/ServiceOptionsSelector";
import { InquiryForm } from "@/components/site/InquiryForm";

/**
 * Service category landing — /services/[slug].
 *
 * Renders whatever the category's `kind` calls for (see modules/catalog/
 * schema.ts: categories have NO description or image column — name/slug/kind/
 * redirectUrl/icon/sortOrder/isActive only):
 *
 *   - `package` (tour-packages, hajj, …): a grid of the category's published
 *     listings (PackageCard) + a closing CTA into /packages pre-filtered to
 *     the category.
 *   - `inquiry_based` (flight-tickets, visa-passport, …): a "what we'll need
 *     from you" checklist + phone/WhatsApp/email contact actions. The
 *     checklist is STATIC COPY derived from the kind (there is no category
 *     body to read from); the form_config-driven InquiryForm + leads module
 *     lands in Plan 4 — see InquirySection for the scope-guard comment.
 *   - `redirect`: a single external CTA to the category's `redirectUrl`
 *     partner site (new tab, rel noopener noreferrer) with a note. A redirect
 *     category whose URL is missing/unset degrades to the contact options.
 *
 * Caching: the read is `'use cache'` + `cacheTag(listings)` + hours profile
 * (see _lib/service-data.ts). Route shell is synchronous and streams inside
 * <Suspense> so PPR keeps the metadata/prerender shell while each slug's
 * content resolves — the same shape as /packages/[slug].
 */

export async function generateMetadata(
  props: PageProps<"/services/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getServicePageData(slug);
  if (!data) return { title: "Service not found" };
  // No inline "| TripMate" suffix: the root layout's title.template
  // ("%s | TripMate") appends it — an inline suffix would double it.
  return {
    title: data.name,
    description: descriptionFor(data),
  };
}

export default function ServicePage(props: PageProps<"/services/[slug]">) {
  return (
    <Suspense fallback={<ServicePageFallback />}>
      <ServicePageBody params={props.params} />
    </Suspense>
  );
}

async function ServicePageBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, site] = await Promise.all([getServicePageData(slug), getSiteSettings()]);
  if (!data) notFound();

  return (
    <>
      <ServiceHero name={data.name} kind={data.kind} icon={data.icon} />

      {data.kind === "package" ? (
        <PackageListing data={data} />
      ) : data.kind === "inquiry_based" ? (
        data.serviceOptions.length > 0 ? (
          <ServiceOptionsSelector
            categoryName={data.name}
            categorySlug={data.slug}
            options={data.serviceOptions}
            site={site}
          />
        ) : (
          <InquirySection data={data} site={site} />
        )
      ) : (
        <RedirectSection data={data} site={site} />
      )}

      {data.kind === "package" ? (
        <CTASection
          headline={`Let's plan your ${data.name.toLowerCase()} journey`}
          sub="Browse every published package in this category — or talk to an advisor and we'll tailor one to your dates and budget."
          ctaLabel="Browse all packages"
          ctaHref={`/packages?cat=${data.slug}`}
          phone={site.phone}
        />
      ) : null}
    </>
  );
}

function descriptionFor(data: ServicePageData): string {
  const count = data.listings.length;
  if (data.kind === "package") {
    return `${data.name} by TripMate — ${count === 0 ? "curated packages with transparent pricing" : `${count} published ${count === 1 ? "package" : "packages"} with fixed itineraries and all-in pricing`}.`;
  }
  if (data.kind === "redirect") {
    return `${data.name} — book direct with TripMate's trusted partner.`;
  }
  return `${data.name} at TripMate — tell us your plan and receive a personalised quote.`;
}

/** package kind: the category's published listings in a card grid. */
function PackageListing({ data }: { data: ServicePageData }) {
  const listings = data.listings;
  return (
    <section aria-labelledby="service-listing-heading" className="bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            kicker="In this service"
            title={`${data.name} packages`}
            lead={`Every published ${data.name} itinerary — fixed routes, transparent pricing.`}
          />
          <Link
            href={`/packages?cat=${data.slug}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40 sm:mb-1"
          >
            View in the full catalogue
          </Link>
        </div>

        {listings.length > 0 ? (
          <div
            data-testid="service-listing-grid"
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            {listings.map((pkg) => (
              <PackageCard
                key={pkg.id}
                href={`/packages/${pkg.slug}`}
                title={pkg.title}
                destination={pkg.destination}
                imageSrc={pkg.image?.url ?? ""}
                imageAlt={pkg.image?.alt ?? pkg.title}
                durationDays={pkg.durationDays}
                rating={pkg.rating}
                price={pkg.price}
                currency={pkg.currency}
              />
            ))}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <ShoppingBag className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
              Packages are being prepared
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              New {data.name} itineraries are on the way — check the full
              catalogue or ask an advisor in the meantime.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * inquiry_based kind: a "what we'll need from you" checklist + dynamic InquiryForm.
 *
 * Scope guard: redirect-kind services unchanged.
 */
const NEEDS: { title: string; detail: string }[] = [
  {
    title: "Your preferred dates",
    detail: "Even approximate dates help us check availability and pricing fast.",
  },
  {
    title: "Travellers",
    detail: "How many people, and whether any children or seniors are travelling.",
  },
  {
    title: "Route & departure",
    detail: "Where you're flying from and where you want to go.",
  },
  {
    title: "Must-haves",
    detail: "Preferred airline, class or a rough budget — the more we know, the closer the first quote.",
  },
];

function InquirySection({
  data,
  site,
}: {
  data: ServicePageData;
  site: { phone: string; email: string };
}) {
  return (
    <section aria-labelledby="inquiry-needs-heading" className="bg-secondary">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
          <div className="space-y-10">
            <div>
              <SectionHeading
                kicker="How it works"
                title="What we'll need from you"
                lead="Every inquiry service is quoted to your plan — there's no published price list. To put together an accurate, no-surprises breakdown, an advisor will ask for:"
              />
              <ul className="mt-10 space-y-4">
                {NEEDS.map((need) => (
                  <li
                    key={need.title}
                    className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-display text-lg font-semibold tracking-tight">
                        {need.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {need.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
                No obligation — you&apos;ll receive a written cost breakdown before
                you commit to anything.
              </p>
            </div>

            <ContactOptions name={data.name} phone={site.phone} email={site.email} />
          </div>

          <div>
            <InquiryForm
              listingId={data.primaryListing?.id}
              listingTitle={data.primaryListing?.title}
              categoryName={data.name}
              formConfig={data.primaryListing?.formConfig}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** redirect kind: single external CTA to the partner site + a clear note. */
function RedirectSection({
  data,
  site,
}: {
  data: ServicePageData;
  site: { phone: string; email: string };
}) {
  return (
    <section aria-labelledby="partner-heading" className="bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
          <div className="max-w-2xl">
            <SectionHeading
              kicker="Partner service"
              title="Booked on our partner's site"
              lead={`${data.name} is delivered and booked directly by a partner we trust. Prices, schedules and terms are set by them.`}
            />
            <div className="mt-8 flex flex-col gap-3 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.redirectUrl
                  ? "Clicking through opens their website in a new tab."
                  : "The partner link isn't set up yet — reach us below and we'll connect you."}
              </p>
              {data.redirectUrl ? (
                <a
                  href={data.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Visit partner site
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>

          {data.redirectUrl ? (
            <aside className="rounded-xl border border-border bg-muted/40 p-6 text-sm leading-relaxed text-muted-foreground">
              Need help choosing? Call or WhatsApp us and we&apos;ll point you at
              the right partner service.
            </aside>
          ) : (
            <ContactOptions name={data.name} phone={site.phone} email={site.email} />
          )}
        </div>
      </div>
    </section>
  );
}

type ContactProps = {
  name: string;
  phone: string;
  email: string;
};

/**
 * The three preferred contact channels as a rounded card (mirrors the package
 * detail sidebar). Call is the visual primary; WhatsApp and email are quiet,
 * non-competing escapes — the §2.1 "one primary CTA" rule concerns competing
 * conversion actions, and contact channels are complementary (precedent:
 * PackageEnquiryCard).
 */
function ContactOptions({ name, phone, email }: ContactProps) {
  // tel/wa hrefs are null when the site has no usable phone (unset or
  // whitespace) — render those links only when the href actually exists, so the
  // card never emits a broken `tel:+` / `wa.me/`.
  const telHref = telLink(phone);
  const waHref = whatsappLink(phone);
  return (
    <aside className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Talk to an advisor
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
        It starts with a conversation
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Share what you&apos;re planning and a TripMate advisor will come back with
        your written quote — usually within a few hours on business days.
      </p>

      <div className="mt-6 space-y-2.5">
        {telHref ? (
          <a
            href={telHref}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span dir="ltr">{phone}</span>
          </a>
        ) : null}
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <MessageCircle className="size-4 text-primary" aria-hidden="true" />
            Chat on WhatsApp
          </a>
        ) : null}
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(`Enquiry: ${name}`)}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <Mail className="size-4 text-primary" aria-hidden="true" />
          Email an advisor
        </a>
      </div>
    </aside>
  );
}

/** Prerendered stand-in while a given slug's content resolves. */
function ServicePageFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="h-[320px] w-full animate-pulse bg-slate-900 sm:h-[360px]" />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="aspect-[4/3] animate-pulse bg-muted/80" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted/80" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
