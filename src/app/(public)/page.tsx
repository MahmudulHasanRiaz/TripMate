import type { Metadata, Route } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/modules/bookings/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublicHomeSettings, getPublicSiteSettings } from "@/modules/settings/site-settings";
import { getSetting } from "@/modules/settings/service";
import { listCategories, listPublishedListings, listDestinationsWithStats } from "@/modules/catalog/service";
import { listPublishedPosts } from "@/modules/content/service";
import type { ServiceKind } from "@/modules/catalog/validation";
import { TestimonialsSection } from "@/components/landing/sections/TestimonialsSection";
import type { TestimonialItem } from "@/modules/landing-pages/section-types";

import { HeroSection } from "@/components/site/HeroSection";
import TravelActionPanel from "@/components/site/TravelActionPanel";
import { TrustStrip } from "@/components/site/TrustStrip";
import { PopularDestinations } from "@/components/site/PopularDestinations";
import { ServiceGrid, type ServiceGridItem } from "@/components/site/ServiceGrid";
import { StatsBand, type Stat } from "@/components/site/StatsBand";
import { SectionHeading } from "@/components/site/SectionHeading";
import { PackageCard } from "@/components/site/PackageCard";
import { HumanConcierge } from "@/components/site/HumanConcierge";
import { BlogCard } from "@/components/site/BlogCard";
import { CTASection } from "@/components/site/CTASection";

/**
 * TripMate marketing home — RSC-only, fully cached.
 *
 * Cache contract (Next 16 Cache Components): `'use cache'` opts this page's
 * output into the cache; `cacheTag` binds it to the settings/listings/posts
 * tags so an admin mutation calling `revalidateTag(tag, "max")` refreshes it in
 * exactly the right places; `cacheLife("hours")` makes the lifetime explicit
 * (content changes a few times a day at most — the docs recommend always
 * setting a profile rather than relying on the implicit `default`).
 *
 * Reads (all server-side, no user fetches): settings.home (hero copy, may be
 * partial/missing), settings.site (phone for the closing CTA), active service
 * categories, destinations, 3 published listings, 3 published posts.
 */
export default async function Home() {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheTag(CACHE_TAGS.listings);
  cacheTag(CACHE_TAGS.posts);
  cacheTag(CACHE_TAGS.orders);
  cacheLife("hours");

  const [
    site,
    homeRaw,
    categories,
    destinations,
    featuredPublished,
    allPublished,
    blog,
    ordersCountRow,
  ] = await Promise.all([
    getSiteSettings(),
    getSetting("home"),
    listCategories(true),
    listDestinationsWithStats(true),
    listPublishedListings({ isFeatured: true, perPage: 3 }),
    listPublishedListings({ perPage: 3 }),
    listPublishedPosts({ perPage: 3 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .catch(() => [{ count: 0 }]),
  ]);

  const home = readHomeSetting(homeRaw);

  const displayPackages =
    featuredPublished.items.length > 0
      ? featuredPublished.items
      : allPublished.items;

  const totalOrders = Number(ordersCountRow[0]?.count ?? 0);
  // Trust figures are admin-configured (settings.home.stats) when present;
  // otherwise they are honest live aggregates - never invented claims.
  const realStats: Stat[] =
    home.stats && home.stats.length > 0
      ? home.stats
      : [
          ...(destinations.length > 0
            ? [{ value: `${destinations.length}+`, label: "Destinations served" }]
            : []),
          ...(totalOrders > 0
            ? [{ value: `${totalOrders}+`, label: "Journeys booked" }]
            : []),
        ];

  const flightCategory = categories.find(
    (c) => c.slug === "flight-tickets" || c.slug.includes("flight") || c.name.toLowerCase().includes("flight")
  );
  const hotelCategory = categories.find(
    (c) => c.slug === "hotel-reservations" || c.slug.includes("hotel") || c.name.toLowerCase().includes("hotel")
  );

  return (
    <>
      {home.showHero ? (
        <HeroSection
          headline={home.headline}
          sub={home.sub}
          ctaLabel={home.ctaLabel}
          ctaHref={home.ctaHref}
          imageSrc={home.imageUrl}
          imageAlt={home.imageAlt}
        />
      ) : null}

      <TravelActionPanel
        destinations={destinations}
        categories={categories}
        flightRedirectUrl={flightCategory?.redirectUrl}
        flightSlug={flightCategory?.slug ?? "flights"}
        hotelRedirectUrl={hotelCategory?.redirectUrl}
        hotelSlug={hotelCategory?.slug ?? "hotels"}
        phone={site.phone}
      />

      <div className="mt-8 sm:mt-12">
        <TrustStrip />
      </div>

      {displayPackages.length > 0 && home.showFeatured ? (
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                kicker={home.featuredKicker}
                title={home.featuredTitle}
                lead={home.featuredLead}
              />
              <Link
                href={PACKAGES_HREF}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40 sm:mb-1"
              >
                View all packages
              </Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {displayPackages.slice(0, 3).map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  title={pkg.title}
                  destination={pkg.destination?.name ?? pkg.category.name}
                  imageSrc={pkg.coverImage?.url ?? ""}
                  imageAlt={pkg.coverImage?.alt ?? pkg.title}
                  durationDays={pkg.durationDays ?? 1}
                  rating={pkg.rating ?? undefined}
                  price={pkg.price ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <PopularDestinations destinations={destinations} />

      {categories.length > 0 ? (
        <section className="bg-secondary/60">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
            <SectionHeading
              kicker="What we do"
              title="Every journey, planned with care"
              lead="Hajj and Umrah, holidays, medical travel, flights and visas — handled end to end by one trusted agency."
              align="center"
            />
            <div className="mt-12 lg:mt-16">
              <ServiceGrid items={categories.map(toServiceItem)} />
            </div>
          </div>
        </section>
      ) : null}

      {realStats.length > 0 && home.showStats ? <StatsBand stats={realStats} /> : null}

      {home.showTestimonials ? <TestimonialsSection config={{ items: home.testimonials }} /> : null}

      <HumanConcierge phone={site.phone} email={site.email} />

      <section className="bg-background">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <SectionHeading
            kicker="Journal"
            title="From the road"
            lead="Trip notes, destination guides and the stories behind the journeys."
            align="center"
          />
          <div className="mt-12 lg:mt-16">
            {blog.items.length > 0 ? (
              <>
                <div
                  data-testid="blog-teaser-grid"
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
                >
                  {blog.items.slice(0, 3).map((post) => (
                    <BlogCard
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      title={post.title}
                      imageSrc={post.featuredImage?.url ?? ""}
                      imageAlt={post.featuredImage?.alt ?? post.title}
                      date={post.publishedAt ?? post.createdAt}
                      author={post.author?.name ?? "TripMate Team"}
                      excerpt={post.excerpt ?? ""}
                    />
                  ))}
                </div>
                <div className="mt-12 text-center">
                  <Link
                    href={BLOG_HREF}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40"
                  >
                    Read the journal
                  </Link>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-lg rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Travel stories, guides and inspiration are on the way.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {home.showCta ? (
        <CTASection
          headline={home.ctaHeadline}
          sub={home.ctaSub}
          ctaLabel="Explore packages"
          ctaHref={PACKAGES_HREF}
          phone={site.phone}
        />
      ) : null}
    </>
  );
}

/** Pages the site nav + primary CTAs share (routes land in Tasks 11-12). */
const PACKAGES_HREF = "/packages" as Route;
const BLOG_HREF = "/blog" as Route;

/**
 * Home metadata (Plan 6 T3): the home page IS the brand page, so the title is
 * the site's own brand verbatim (title.absolute replaces the root "| TripMate"
 * template rather than appending to it), and the description is the hero
 * sub-headline the visitor sees — falling back to the same site-sensible
 * default the root layout carries when no hero copy is saved. Both reads go
 * through the cached typed settings readers, so metadata stays a cache hit and
 * an admin save lands in one hop; the page's own cached rendering below is
 * untouched and shares the settings tag.
 */
const HOME_META_DESCRIPTION_FALLBACK =
  "Hajj & Umrah packages, tours, flights and visa services.";

export async function generateMetadata(): Promise<Metadata> {
  const [site, home] = await Promise.all([
    getPublicSiteSettings(),
    getPublicHomeSettings(),
  ]);
  return {
    title: { absolute: site.title },
    description: home.heroSub ?? HOME_META_DESCRIPTION_FALLBACK,
  };
}

/**
 * settings.home is free-form jsonb that may be partial or entirely absent (the
 * seed stores only heroHeadline + heroSub). Project defensively onto a typed
 * shape with sensible marketing defaults so the hero always has copy.
 */
const DEFAULT_HEADLINE = "Your Journey Begins Here";
const DEFAULT_SUB =
  "Hajj, Umrah, tours, flights & visa — one trusted agency for every journey.";
const DEFAULT_CTA_LABEL = "Explore packages";

function readHomeSetting(raw: Record<string, unknown> | null): {
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  imageAlt: string;
  featuredKicker: string;
  featuredTitle: string;
  featuredLead: string;
  ctaHeadline: string;
  ctaSub: string;
  stats?: Stat[];
  testimonials: TestimonialItem[];
  showHero: boolean;
  showFeatured: boolean;
  showCta: boolean;
  showStats: boolean;
  showTestimonials: boolean;
} {
  const pick = (key: string): string | undefined =>
    typeof raw?.[key] === "string" && (raw[key] as string).trim()
      ? (raw[key] as string).trim()
      : undefined;

  // CTA link is honoured only when it points at an internal path; otherwise the
  // hero keeps its single primary action on /packages.
  const link = pick("heroButtonLink");
  const internalLink =
    link && link.startsWith("/") && !link.startsWith("//") ? link : undefined;

  const rawTestimonials = Array.isArray(raw?.testimonials)
    ? (raw.testimonials as TestimonialItem[]).filter(
        (t) => t && typeof t.quote === "string" && typeof t.name === "string",
      )
    : null;

  const rawStats = Array.isArray(raw?.stats)
    ? (raw.stats as Stat[]).filter(
        (s) => s && typeof s.value === "string" && typeof s.label === "string",
      )
    : undefined;

  return {
    headline: pick("heroHeadline") ?? DEFAULT_HEADLINE,
    sub: pick("heroSub") ?? DEFAULT_SUB,
    ctaLabel: pick("heroButtonLabel") ?? DEFAULT_CTA_LABEL,
    ctaHref: (internalLink ?? PACKAGES_HREF) as Route,
    imageUrl: pick("heroImage") ?? null,
    imageAlt: pick("heroImageAlt") ?? "",
    featuredKicker: pick("featuredKicker") ?? "Featured packages",
    featuredTitle: pick("featuredTitle") ?? "Hand-picked journeys",
    featuredLead:
      pick("featuredLead") ??
      "A few of the trips travellers book with us most — fixed itineraries, transparent pricing.",
    ctaHeadline: pick("ctaHeadline") ?? "Let's plan your next journey",
    ctaSub:
      pick("ctaSub") ??
      "From Hajj and Umrah to family holidays and medical travel — talk to a TripMate advisor today.",
    stats: rawStats,
    testimonials: rawTestimonials ?? [],
    showHero: raw?.showHero !== false,
    showFeatured: raw?.showFeatured !== false,
    showCta: raw?.showCta !== false,
    showStats: raw?.showStats !== false,
    showTestimonials: raw?.showTestimonials !== false,
  };
}

/** One-line customer-facing promise per category kind. */
const SERVICE_KIND_BLURB: Record<ServiceKind, string> = {
  package: "Curated packages with transparent, published pricing.",
  inquiry_based: "Tell us your plan — we'll craft a personalised quote.",
  redirect: "Book direct with our trusted partner.",
};

function toServiceItem(category: {
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
  icon: string | null;
}): ServiceGridItem {
  const external = category.kind === "redirect" && Boolean(category.redirectUrl);
  return {
    href: external
      ? (category.redirectUrl as string)
      : `/services/${category.slug}`,
    slug: category.slug,
    external,
    icon: category.icon,
    name: category.name,
    blurb: SERVICE_KIND_BLURB[category.kind],
  };
}
