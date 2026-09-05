import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getPostById,
  listPostCategories,
  type PostWithRefs,
} from "@/modules/content/service";
import PostForm, {
  type PostCategoryOption,
  type PostFormInitial,
} from "../../PostForm";

export const metadata: Metadata = { title: "Edit post · Content" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

function toFormInitial(post: PostWithRefs): PostFormInitial {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    featuredImageUrl: post.featuredImage?.url ?? "",
    gallery: post.gallery.map((image) => ({
      url: image.url,
      alt: image.alt ?? "",
    })),
    categoryId: post.categoryId ?? "",
    status: post.status,
    seoTitle: post.seo?.title ?? "",
    seoDescription: post.seo?.description ?? "",
  };
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  const categories: PostCategoryOption[] = (await listPostCategories()).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={"/admin/content/posts" as Route}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to posts
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">Edit post</h2>
        <p className="text-sm text-muted-foreground">{post.title}</p>
      </div>
      <PostForm initial={toFormInitial(post)} categories={categories} />
    </div>
  );
}
