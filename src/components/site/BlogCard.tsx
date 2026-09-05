import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, PenLine } from "lucide-react";

import { cn } from "@/lib/utils";

type BlogCardProps = {
  href: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  date: Date | string;
  author: string;
  excerpt: string;
};

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

function parseDate(date: Date | string): Date | null {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | string): string {
  const d = parseDate(date);
  if (!d) return String(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Machine-readable ISO date (yyyy-mm-dd) for the time element — never the localized label. */
function isoDate(date: Date | string): string {
  const d = parseDate(date);
  return d ? d.toISOString().slice(0, 10) : String(date);
}

/**
 * Editorial blog card (spec §3 BlogCard). Quiet 3:2 image, date + author meta,
 * excerpt teaser. Server-rendered.
 */
export function BlogCard({
  href,
  title,
  imageSrc,
  imageAlt,
  date,
  author,
  excerpt,
}: BlogCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 ease-out-quint",
        "hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <Link href={href as Route} className="block">
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes={IMAGE_SIZES}
              className="object-cover transition-transform duration-300 ease-out-quint group-hover:scale-[1.02]"
            />
          ) : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            <time dateTime={isoDate(date)}>{formatDate(date)}</time>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <PenLine className="size-4 text-primary" aria-hidden="true" />
            {author}
          </li>
        </ul>
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
          <Link
            href={href as Route}
            className="underline-offset-4 transition-colors group-hover:text-primary"
          >
            {title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      </div>
    </article>
  );
}
