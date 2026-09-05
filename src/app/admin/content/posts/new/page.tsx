import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { listPostCategories } from "@/modules/content/service";
import PostForm, {
  type PostCategoryOption,
  type PostFormInitial,
} from "../PostForm";

export const metadata: Metadata = { title: "New post · Content" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

function emptyFormInitial(): PostFormInitial {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImageUrl: "",
    gallery: [],
    categoryId: "",
    status: "draft",
    seoTitle: "",
    seoDescription: "",
  };
}

export default async function NewPostPage() {
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
        <h2 className="text-lg font-semibold tracking-tight">New post</h2>
        <p className="text-sm text-muted-foreground">
          Create a blog post. It stays a draft until you publish it.
        </p>
      </div>
      <PostForm initial={emptyFormInitial()} categories={categories} />
    </div>
  );
}
