import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, PenLine } from "lucide-react";

import { ProseMarkdown } from "@/components/site/ProseMarkdown";
import { Gallery } from "@/components/site/Gallery";
import { JsonLd } from "@/components/site/JsonLd";
import { detailMetadata, youtubeEmbedUrl } from "@/lib/seo-meta";

import { getBlogPostData } from "../_lib/blog-data";

/**
 * Blog post — /blog/[slug].
 *
 * Cached read by slug (posts tag + hours profile, see _lib/blog-data.ts), so
 * an admin publish/edit of a post revalidates the exact article. Body streams
 * inside <Suspense> under a PPR-friendly shell — same shape as /packages/
 * [slug]. No generateStaticParams: prerendering every post at build time would
 * freeze whatever posts exist in the build DB; on-demand render + the tag
 * contract keeps a just-published edit one cache hop away.
 */


export async function generateMetadata(
  props: PageProps<"/blog/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getBlogPostData(slug);
  if (!post) return { title: "Post not found" };

  const description = post.seoDescription || post.excerpt || undefined;
  return detailMetadata({
    path: `/blog/${post.slug}`,
    title: post.seoTitle || post.title,
    description,
    image: post.image,
  });
}

export default function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<BlogPostFallback />}>
      <BlogPostBody params={props.params} />
    </Suspense>
  );
}

async function BlogPostBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostData(slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://tripmate.example",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: "https://tripmate.example/blog",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: `https://tripmate.example/blog/${post.slug}`,
          },
        ],
      },
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.seoDescription || post.excerpt || post.title,
        image: post.image?.url ? [post.image.url] : undefined,
        datePublished: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : undefined,
        author: {
          "@type": "Person",
          name: post.author || "TripMate Team",
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <article className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 lg:px-8 lg:pb-28 lg:pt-12">
      <Link
        href="/blog"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the journal
      </Link>

      <header className="mx-auto mt-6 max-w-3xl text-center">
        {post.category ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {post.category}
          </p>
        ) : null}
        <h1 className="text-balance font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <PenLine className="size-4 text-primary" aria-hidden="true" />
            {post.author}
          </li>
        </ul>
      </header>

      {post.image ? (
        <div className="relative mx-auto mt-10 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-xl bg-muted">
          <Image
            src={post.image.url}
            alt={post.image.alt}
            fill
            priority
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl">
        {post.content.trim() ? (
          <ProseMarkdown>{post.content}</ProseMarkdown>
        ) : post.excerpt ? (
          <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
        ) : null}
      </div>

      {post.gallery.length > 0 ? (
        <div className="mx-auto mt-10 max-w-4xl">
          <Gallery
            images={post.gallery.map((image) => ({ src: image.url, alt: image.alt }))}
          />
        </div>
      ) : null}

      {post.videoUrl ? (
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-border bg-card">
          {youtubeEmbedUrl(post.videoUrl) ? (
            <iframe
              src={youtubeEmbedUrl(post.videoUrl) as string}
              title={`${post.title} — video`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          ) : (
            <video src={post.videoUrl} controls preload="metadata" className="aspect-video w-full bg-black">
              Your browser cannot play this video.
            </video>
          )}
        </div>
      ) : null}
    </article>
  </>
  );
}

function isoDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Prerendered stand-in while a given slug's content resolves. */
function BlogPostFallback() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/80" />
        <div className="mx-auto mt-10 max-w-3xl space-y-3 text-center">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted/80" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted/80" />
        </div>
        <div className="mx-auto mt-10 aspect-[16/9] max-w-4xl animate-pulse rounded-xl bg-muted/80" />
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-muted/80"
              style={{ width: `${90 - (i % 4) * 10}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
