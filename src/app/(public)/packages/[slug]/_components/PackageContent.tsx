import type { ReactNode } from "react";

import { Check, ChevronDown, X } from "lucide-react";

import { ProseMarkdown } from "@/components/site/ProseMarkdown";
import { Gallery } from "@/components/site/Gallery";
import { youtubeEmbedUrl } from "@/lib/seo-meta";

import type { PackageDetailData } from "../../_lib/catalog-data";

/**
 * Long-form detail sections under the hero (spec §3 PackageDetailLayout).
 * All server-rendered and fully data-driven: every section renders only when
 * its content exists, so a sparse listing shows no hollow blocks. The
 * itinerary is a native <details> accordion (zero client JS, keyboard-
 * operable by default), the inclusions/exclusions are quiet 2-col check/cross
 * cards, and markdown goes through ProseMarkdown's react-markdown +
 * rehype-sanitize pipeline — never raw HTML.
 */
export function PackageContent({ data }: { data: PackageDetailData }) {
  const { summary, description, gallery, videoUrl, itinerary, inclusions, exclusions } = data;
  const hasLongform = Boolean(summary || description);

  return (
    <div className="space-y-12 lg:space-y-14">
      {hasLongform ? (
        <section
          aria-labelledby={description ? "package-about-heading" : undefined}
        >
          {summary ? (
            <p
              data-testid="package-summary"
              className="text-xl leading-relaxed text-muted-foreground"
            >
              {summary}
            </p>
          ) : null}
          {description ? (
            <div className={summary ? "mt-8" : undefined}>
              <SectionHeading id="package-about-heading">About this package</SectionHeading>
              <ProseMarkdown className="prose-tripmate mt-5">{description}</ProseMarkdown>
            </div>
          ) : null}
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section
          id="package-gallery"
          aria-labelledby="package-gallery-heading"
          className="scroll-mt-28"
        >
          <SectionHeading meta={`${gallery.length} ${gallery.length === 1 ? "photo" : "photos"}`}>
            Gallery
          </SectionHeading>
          <Gallery
            className="mt-6"
            images={gallery.map((image) => ({ src: image.url, alt: image.alt }))}
          />
        </section>
      ) : null}

      {videoUrl ? <PackageVideo url={videoUrl} title={data.title} /> : null}

      {itinerary.length > 0 ? (
        <section aria-labelledby="package-itinerary-heading" data-testid="package-itinerary">
          <SectionHeading
            meta={`${itinerary.length} ${itinerary.length === 1 ? "day" : "days"}`}
          >
            Itinerary
          </SectionHeading>
          <div className="mt-6 space-y-3">
            {itinerary.map((day, i) => (
              <details
                key={`${day.day}-${day.title}-${i}`}
                className="group rounded-xl border border-border bg-card transition-[border-color,box-shadow] duration-300 open:border-primary/30 open:shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_8px_24px_-16px_rgba(0,0,0,0.25)]"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden [&::marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold tabular-nums text-primary ring-1 ring-primary/10 transition-colors group-open:bg-primary group-open:text-primary-foreground group-open:ring-primary/30">
                    {day.day}
                  </span>
                  <span className="min-w-0 flex-1">{day.title}</span>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary"
                    aria-hidden="true"
                  />
                </summary>
                {day.details ? (
                  <p className="whitespace-pre-line border-t border-border/70 px-4 pb-5 pt-3.5 text-sm leading-relaxed text-muted-foreground sm:pl-[4.25rem] sm:pr-6 sm:text-[0.925rem]">
                    {day.details}
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {inclusions.length > 0 || exclusions.length > 0 ? (
        <section aria-label="Inclusions and exclusions">
          <div className="grid gap-5 sm:grid-cols-2">
            {inclusions.length > 0 ? (
              <IncludedList title="Included" items={inclusions} />
            ) : null}
            {exclusions.length > 0 ? (
              <IncludedList title="Not included" items={exclusions} negative />
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PackageVideo({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbedUrl(url);
  return (
    <section aria-labelledby="package-video-heading">
      <SectionHeading>Watch</SectionHeading>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {embed ? (
          <iframe
            src={embed}
            title={`${title} — video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <video src={url} controls preload="metadata" className="aspect-video w-full bg-black">
            Your browser cannot play this video.
          </video>
        )}
      </div>
    </section>
  );
}

/**
 * Section title with a hand-set accent marker and an optional right-aligned
 * tabular meta chip (counts), so headers carry quick facts without a second
 * line of chrome.
 */
function SectionHeading({ id, meta, children }: { id?: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        id={id}
        className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-balance sm:text-[1.7rem] sm:leading-snug"
      >
        <span aria-hidden="true" className="h-7 w-1 shrink-0 rounded-full bg-accent" />
        {children}
      </h2>
      {meta ? (
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function IncludedList({
  title,
  items,
  negative = false,
}: {
  title: string;
  items: string[];
  negative?: boolean;
}) {
  const Icon = negative ? X : Check;
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
        <span
          className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.7rem] font-bold tabular-nums ${
            negative ? "bg-muted text-muted-foreground" : "bg-secondary text-primary"
          }`}
        >
          {items.length}
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed">
            <span
              className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                negative
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-primary"
              }`}
            >
              <Icon className="size-3" aria-hidden="true" />
            </span>
            <span className={negative ? "text-muted-foreground" : "text-foreground"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
