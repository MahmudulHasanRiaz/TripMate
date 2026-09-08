import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { FaqAccordion } from "@/components/site/FaqAccordion";
import { ProseMarkdown } from "@/components/site/ProseMarkdown";

import { getStaticPageData, type StaticPageData } from "../_lib/page-data";
import { tryParseFaqSections } from "../_lib/faq-parse";

/**
 * Dynamic static page — /p/[slug] (about-us, faq, terms-of-service,
 * privacy-policy, …).
 *
 * Renders the page's markdown sections (each section cell = one sanitized
 * ProseMarkdown block). Cached read by slug (pages tag + hours profile, see
 * _lib/page-data.ts) so an admin page edit revalidates exactly this route.
 * No generateStaticParams: prerendering every page at build would freeze the
 * build DB's set; on-demand render + the tag contract stays correct for
 * just-published pages.
 *
 * The FAQ page (slug === "faq") gets special treatment: its seeded sections
 * are clean `## Question` + plain-answer pairs, which the server parses into
 * FaqAccordion items (see _lib/faq-parse.ts). The parse is conservative — if
 * an admin ever writes rich/multi-paragraph markdown the parser returns null
 * and the page degrades to the plain prose path below rather than leaking
 * markdown characters into an accordion body. (Deliberately slug-scoped, not a
 * generic "looks like a Q&A" heuristic, so an ordinary page whose sections
 * happen to start with `##` is never mistaken for an FAQ.)
 */


export async function generateMetadata(
  props: PageProps<"/p/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getStaticPageData(slug);
  if (!data) return { title: "Page not found" };
  return {
    title: data.seoTitle || data.title,
    ...(data.seoDescription ? { description: data.seoDescription } : {}),
  };
}

export default function StaticPage(props: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<StaticPageFallback />}>
      <StaticPageBody params={props.params} />
    </Suspense>
  );
}

async function StaticPageBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

/** FAQ page: accordion when the markdown parses to clean Q&A, else prose. */
function FaqPageBody({ data }: { data: StaticPageData }) {
  const items = tryParseFaqSections(data.sections);
  if (!items) {
    // Fallback path: rich or multi-paragraph markdown — the accordion body
    // renders plain text and cannot carry it, so render as prose instead.
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

/** Prerendered stand-in while a given slug's content resolves. */
function StaticPageFallback() {
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
