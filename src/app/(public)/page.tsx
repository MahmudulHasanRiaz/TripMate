import type { Route } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSiteSettings } from "@/lib/site-settings";
import { getSetting } from "@/modules/settings/service";
import { listCategories, listPublishedListings } from "@/modules/catalog/service";
import { listPublishedPosts } from "@/modules/content/service";
import type { ServiceKind } from "@/modules/catalog/validation";

import { HeroSection } from "@/components/site/HeroSection";
import { ServiceGrid, type ServiceGridItem } from "@/components/site/ServiceGrid";
import { StatsBand, type Stat } from "@/components/site/StatsBand";
import { SectionHeading } from "@/components/site/SectionHeading";
import { PackageCard } from "@/components/site/PackageCard";
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
 * categories, 3 published listings, 3 published posts. The seeded DB has no
 * posts, so the blog band renders a quiet empty state until content ships.
 *
 * Route-change chrome (header/footer/skip-link) lives in the (public) layout;
 * this page only renders the <main> content sections.
 */
export default async function Home() {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheTag(CACHE_TAGS.listings);
  cacheTag(CACHE_TAGS.posts);
  cacheLife("hours");

  const [site, homeRaw, categories, published, blog] = await Promise.all([
    getSiteSettings(),
    getSetting("home"),
    listCategories(true),
    listPublishedListings({ perPage: 3 }),
    listPublishedPosts({ perPage: 3 }),
  ]);

  const home = readHomeSetting(homeRaw);

  return (
    <>
      <HeroSection
        headline={home.headline}
        sub={home.sub}
        ctaLabel={home.ctaLabel}
        ctaHref={home.ctaHref}
        imageSrc={home.imageUrl}
        imageAlt={home.imageAlt}
      />

      {categories.length > 0 ? (
        <section className="bg-secondary">
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

      {published.items.length > 0 ? (
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                kicker="Featured packages"
                title="Hand-picked journeys"
                lead="A few of the trips travellers book with us most — fixed itineraries, transparent pricing."
              />
              <Link
                href={PACKAGES_HREF}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40 sm:mb-1"
              >
                View all packages
              </Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {published.items.slice(0, 3).map((pkg) => (
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

      <StatsBand stats={STATS} />

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

      <CTASection
        headline="Let's plan your next journey"
        sub="From Hajj and Umrah to family holidays and medical travel — talk to a TripMate advisor today."
        ctaLabel="Explore packages"
        ctaHref={PACKAGES_HREF}
        phone={site.phone}
      />
    </>
  );
}

/** Pages the site nav + primary CTAs share (routes land in Tasks 11-12). */
const PACKAGES_HREF = "/packages" as Route;
const BLOG_HREF = "/blog" as Route;

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
} {
  const pick = (key: string): string | undefined =>
    typeof raw?.[key] === "string" && (raw[key] as string).trim()
      ? (raw[key] as string).trim()
      : undefined;

  // CTA link is honoured only when it points at an internal path; otherwise the
  // hero keeps its single primary action on /packages (Task 10 scope).
  const link = pick("heroButtonLink");
  const internalLink =
    link && link.startsWith("/") && !link.startsWith("//") ? link : undefined;

  return {
    headline: pick("heroHeadline") ?? DEFAULT_HEADLINE,
    sub: pick("heroSub") ?? DEFAULT_SUB,
    ctaLabel: pick("heroButtonLabel") ?? DEFAULT_CTA_LABEL,
    ctaHref: (internalLink ?? PACKAGES_HREF) as Route,
    imageUrl: pick("heroImage") ?? null,
    imageAlt: pick("heroImageAlt") ?? "",
  };
}

/** One-line customer-facing promise per category kind (v1 label stand-in). */
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
  // Only a redirect-kind category WITH a destination URL is an external link.
  // A redirect row whose URL is missing/unset renders as a plain internal link
  // to /services/{slug} instead (no external marker, no blank-target escape).
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

/**
 * V1 placeholder trust figures — deliberately static copy so the band renders
 * pre-launch. A later plan replaces these with real aggregates (years in
 * business, orders served, destinations covered, average rating).
 */
const STATS: Stat[] = [
  { value: "12+", label: "Years of service" },
  { value: "25,000+", label: "Happy travellers" },
  { value: "30+", label: "Destinations served" },
  { value: "4.9/5", label: "Average rating" },
];
