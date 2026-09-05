import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getSiteSettings } from "@/lib/site-settings";
import { PackageCard } from "@/components/site/PackageCard";

import { getPackageDetailData } from "../_lib/catalog-data";
import { PackageHero } from "./_components/PackageHero";
import { PackageContent } from "./_components/PackageContent";
import { PackageEnquiryCard, PackageMobileBar } from "./_components/PackageSidebar";

/**
 * Package detail — /packages/[slug].
 *
 * Data flows through `getPackageDetailData` (cached by slug, tagged with
 * CACHE_TAGS.listings + the slug-scoped listing tag, hours profile). No
 * generateStaticParams: prerendering every slug at build time would freeze
 * whichever listings exist in the build database (incl. transient e2e rows),
 * so unknown/just-published slugs render on demand and the cached read + tag
 * contract keeps a published edit from an admin action one cache hop away.
 *
 * The route shell is synchronous and streams the whole detail inside
 * `<Suspense>`: params (runtime) are awaited in the child, outside every
 * cached scope, per the Cache Components "pass runtime values to cached
 * functions" pattern — the same shape /packages uses for searchParams. This
 * keeps the shell prerenderable under PPR while each slug's content is a
 * `'use cache'` hit. Booking form is Plan 5 — see PackageSidebar's
 * enquiry-only CTAs.
 */
export async function generateMetadata(
  props: PageProps<"/packages/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getPackageDetailData(slug);
  if (!data) return { title: "Package not found" };

  const description = data.seoDescription || data.summary || undefined;
  return {
    title: data.seoTitle || data.title,
    ...(description ? { description } : {}),
  };
}

export default function PackageDetailPage(props: PageProps<"/packages/[slug]">) {
  return (
    <Suspense fallback={<PackageDetailFallback />}>
      <PackageDetailBody params={props.params} />
    </Suspense>
  );
}

async function PackageDetailBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, site] = await Promise.all([
    getPackageDetailData(slug),
    getSiteSettings(),
  ]);
  if (!data) notFound();

  return (
    <>
      <PackageHero data={data} />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="min-w-0">
            <PackageContent data={data} />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <PackageEnquiryCard data={data} phone={site.phone} email={site.email} />
            </div>
          </aside>
        </div>

        {data.related.length > 0 ? (
          <section aria-labelledby="package-related-heading" className="mt-16 lg:mt-24">
            <h2
              id="package-related-heading"
              className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              You may also like
            </h2>
            <div
              data-testid="package-related"
              className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
            >
              {data.related.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  href={`/packages/${pkg.slug}`}
                  title={pkg.title}
                  destination={pkg.destination}
                  imageSrc={pkg.image?.url ?? ""}
                  imageAlt={pkg.image?.alt ?? pkg.title}
                  durationDays={pkg.durationDays ?? undefined}
                  rating={pkg.rating ?? undefined}
                  price={pkg.price ?? undefined}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <PackageMobileBar data={data} phone={site.phone} email={site.email} />
    </>
  );
}

/** Prerendered stand-in while a given slug's content resolves. */
function PackageDetailFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="h-[420px] w-full animate-pulse bg-muted/80 lg:h-[520px]" />
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 lg:px-8 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-12">
            <div className="space-y-3">
              <div className="h-6 w-2/5 animate-pulse rounded bg-muted/80" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/80" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/80" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="h-40 animate-pulse rounded-lg bg-muted/80" />
              <div className="h-40 animate-pulse rounded-lg bg-muted/80" />
            </div>
          </div>
          <div className="h-80 animate-pulse rounded-xl bg-muted/80" />
        </div>
      </div>
    </div>
  );
}
