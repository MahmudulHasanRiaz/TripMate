import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  ChevronRight,
  Compass,
  FileCheck2,
  Home as HomeIcon,
  MapPin,
} from "lucide-react";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { detailMetadata } from "@/lib/seo-meta";
import { getSiteSettings } from "@/lib/site-settings";
import {
  getDestinationBySlug,
  listPublishedListings,
} from "@/modules/catalog/service";
import { listVisaServices } from "@/modules/catalog/visa-service";
import { PackageCard } from "@/components/site/PackageCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Gallery } from "@/components/site/Gallery";
import { VideoGallery } from "@/components/site/VideoGallery";
import { buildVideoObject } from "@/lib/videos";
import { CTASection } from "@/components/site/CTASection";
import DestinationVisaCard from "./_components/DestinationVisaCard";
import { JsonLd } from "@/components/site/JsonLd";

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
};


export async function generateMetadata(
  props: DestinationPageProps,
): Promise<Metadata> {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const { slug } = await props.params;
  const [destination, site] = await Promise.all([
    getDestinationBySlug(slug, true),
    getSiteSettings(),
  ]);
  if (!destination) return { title: "Destination Not Found" };

  const brand = site.title?.trim() || "TripMate";

  const title =
    destination.seo && typeof destination.seo.title === "string" && destination.seo.title.trim()
      ? destination.seo.title.trim()
      : `${destination.name} Travel Packages & Visa Assistance`;

  const description =
    destination.seo &&
    typeof destination.seo.description === "string" &&
    destination.seo.description.trim()
      ? destination.seo.description.trim()
      : (destination.description?.slice(0, 160) ||
        `Explore travel itineraries, holiday packages, and visa processing for ${destination.name} with ${brand}.`);

  return detailMetadata({
    path: `/destinations/${destination.slug}`,
    title,
    brand,
    description,
    image: destination.image ? { url: destination.image, alt: destination.name } : null,
  });
}

export default function DestinationPage(props: DestinationPageProps) {
  return (
    <Suspense fallback={<DestinationPageFallback />}>
      <DestinationPageBody params={props.params} />
    </Suspense>
  );
}

async function DestinationPageBody({ params }: { params: Promise<{ slug: string }> }) {
  "use cache";
  cacheTag(CACHE_TAGS.listings);
  cacheLife("minutes");

  const { slug } = await params;
  const destination = await getDestinationBySlug(slug, true);
  if (!destination) notFound();

  const [site, packages, visas] = await Promise.all([
    getSiteSettings(),
    listPublishedListings({ destinationSlug: destination.slug }),
    listVisaServices({ destinationId: destination.id, activeOnly: true }),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://tripmate.example",
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Destinations",
            "item": "https://tripmate.example/packages",
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": destination.name,
            "item": `https://tripmate.example/destinations/${destination.slug}`,
          },
        ],
      },
      {
        "@type": "TouristDestination",
        "name": destination.name,
        "description": destination.description || `${destination.name} travel packages and services`,
        "image": destination.image || undefined,
        "touristType": ["Holiday", "Adventure", "Leisure", "Family"],
      },
      // One VideoObject per video (FU-35), mirroring the packages page.
      ...destination.videos.map((video) =>
        buildVideoObject(video, {
          entityTitle: destination.name,
          uploadDate: destination.updatedAt,
          fallbackThumbnailUrl: destination.image,
        }),
      ),
    ],
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <JsonLd data={jsonLd} />

      {/* Hero Section with Backdrop */}
      <div className="relative overflow-hidden bg-slate-950 text-white">
        {destination.image ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-configured image may be a local or R2 host */}
            <img
              src={destination.image}
              alt={destination.name}
              className="h-full w-full object-cover object-center opacity-40 filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/30 via-slate-950 to-slate-900" />
        )}

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-16 sm:py-24 lg:px-8 lg:py-28">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumbs" className="mb-6 flex items-center gap-1.5 text-xs text-slate-300">
            <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-white">
              <HomeIcon className="size-3.5" aria-hidden="true" />
              <span>Home</span>
            </Link>
            <ChevronRight className="size-3 text-slate-500" aria-hidden="true" />
            <Link href="/packages" className="transition-colors hover:text-white">
              Destinations
            </Link>
            <ChevronRight className="size-3 text-slate-500" aria-hidden="true" />
            <span className="font-semibold text-white" aria-current="page">
              {destination.name}
            </span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-xs">
              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
              <span>Curated Destination</span>
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {destination.name}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-200 sm:text-lg">
              {destination.description ||
                `Discover top-rated vacation itineraries, fixed-departure holiday packages, and streamlined visa assistance for ${destination.name}.`}
            </p>

            {/* Quick Metrics */}
            <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-white">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-xs">
                <Compass className="size-4 text-primary" aria-hidden="true" />
                <span>{packages.total} {packages.total === 1 ? "Tour Package" : "Tour Packages"}</span>
              </div>
              {visas.length > 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-xs">
                  <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
                  <span>{visas.length} {visas.length === 1 ? "Visa Option" : "Visa Options"} Available</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24 space-y-20">
        {/* Gallery Section (FU-35 — only when the destination has photos) */}
        {destination.gallery.length > 0 ? (
          <section aria-label="Gallery">
            <SectionHeading
              kicker="Gallery"
              title={`${destination.name} in pictures`}
            />
            <Gallery
              className="mt-10"
              images={destination.gallery.map((g) => ({
                src: g.url,
                alt: g.alt ?? destination.name,
              }))}
            />
          </section>
        ) : null}

        {/* Watch Section (FU-35 — only when the destination has videos) */}
        {destination.videos.length > 0 ? (
          <section aria-label="Watch">
            <SectionHeading
              kicker="Watch"
              title={`Experience ${destination.name}`}
            />
            <VideoGallery
              className="mt-10"
              videos={destination.videos}
              title={destination.name}
            />
          </section>
        ) : null}

        {/* Published Packages Section */}
        <section aria-labelledby="destination-packages-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              kicker="Travel Packages"
              title={`${destination.name} Itineraries`}
              lead={`Fixed routes, transparent pricing, and hotel accommodations in ${destination.name}.`}
            />
            {packages.total > 0 ? (
              <Link
                href={`/packages?dest=${encodeURIComponent(destination.slug)}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
              >
                View all {packages.total} packages
              </Link>
            ) : null}
          </div>

          {packages.items.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {packages.items.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  title={pkg.title}
                  destination={pkg.destination?.name ?? destination.name}
                  imageSrc={pkg.coverImage?.url ?? ""}
                  imageAlt={pkg.coverImage?.alt ?? pkg.title}
                  durationDays={pkg.durationDays}
                  rating={pkg.rating}
                  price={pkg.price}
                  currency={pkg.currency}
                />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
              <Compass className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                Custom itineraries available
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                We are refreshing our public packages for {destination.name}. Contact our travel desk
                for private tailor-made quotations to your preferred dates.
              </p>
            </div>
          )}
        </section>

        {/* Visa Services Section (if any visas available) */}
        {visas.length > 0 ? (
          <section aria-labelledby="destination-visas-heading">
            <SectionHeading
              kicker="Visa Processing"
              title={`Visa Services for ${destination.name}`}
              lead="Complete document screening, appointment booking, and visa consultancy."
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {visas.map((v) => (
                <DestinationVisaCard
                  key={v.id}
                  visa={v}
                  brand={site.title?.trim() || "TripMate"}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Closing CTA */}
      <CTASection
        headline={`Plan your journey to ${destination.name}`}
        sub="Our destination specialists design customized tours, manage hotel bookings, and organize smooth visa paperwork."
        ctaLabel="Browse all packages"
        ctaHref={`/packages?dest=${encodeURIComponent(destination.slug)}`}
        phone={site.phone}
      />
    </>
  );
}

function DestinationPageFallback() {
  return (
    <div className="animate-pulse">
      <div className="h-[360px] w-full bg-slate-900" />
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
