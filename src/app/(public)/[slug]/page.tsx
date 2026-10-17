import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { FaqAccordion } from "@/components/site/FaqAccordion";
import { ProseMarkdown } from "@/components/site/ProseMarkdown";
import { detailMetadata } from "@/lib/seo-meta";
import { isReservedSlug } from "@/modules/content/validation";

import { getStaticPageData, type StaticPageData } from "../p/_lib/page-data";
import { tryParseFaqSections } from "../p/_lib/faq-parse";

/**
 * Evergreen page — /{slug} (§2.3). Replaces the legacy /p/[slug] surface
 * (which now 301-redirects here). Reserved slugs (packages, blog, admin, …)
 * never resolve as pages so static routes always win.
 */

export async function generateMetadata(
  props: PageProps<"/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  if (isReservedSlug(slug)) return { title: "Page not found" };
  const data = await getStaticPageData(slug);
  if (!data) return { title: "Page not found" };
  return detailMetadata({
    path: `/${data.slug}`,
    title: data.seoTitle || data.title,
    description: data.seoDescription || undefined,
  });
}

export default function EvergreenPage(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<EvergreenFallback />}>
      <EvergreenBody params={props.params} />
    </Suspense>
  );
}

async function EvergreenBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isReservedSlug(slug)) notFound();
  const data = await getStaticPageData(slug);
  if (!data) notFound();

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 lg:px-8 lg:pb-28 lg:pt-14">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to home
      </Link>

      <header className="mx-auto mt-4 max-w-3xl text-center">
        <h1 className="text-balance font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {data.title}
        </h1>
      </header>

      {data.slug === "faq" ? (
        <FaqPageBody data={data} />
      ) : (
        <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-10">
          {data.sections.map((section, i) => (
            <ProseMarkdown key={`${section.type}-${i}`}>{section.content}</ProseMarkdown>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqPageBody({ data }: { data: StaticPageData }) {
  const items = tryParseFaqSections(data.sections);
  if (!items) {
    return (
      <div className="mx-auto mt-12 flex max-w-3xl flex-col gap-10">
        {data.sections.map((section, i) => (
          <ProseMarkdown key={`${section.type}-${i}`}>{section.content}</ProseMarkdown>
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <FaqAccordion items={items} />
    </div>
  );
}

function EvergreenFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-10 lg:px-8 lg:pt-14">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/80" />
        <div className="mx-auto mt-10 h-10 w-1/2 animate-pulse rounded bg-muted/80" />
        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-muted/80"
              style={{ width: `${92 - (i % 4) * 8}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
