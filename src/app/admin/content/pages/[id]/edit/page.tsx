import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPageById, type Page } from "@/modules/content/service";
import PageForm, { type PageFormInitial } from "../../PageForm";

export const metadata: Metadata = { title: "Edit page · Content" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

function toFormInitial(page: Page): PageFormInitial {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    sections: page.sections.map((section) => ({ content: section.content })),
    seoTitle: page.seo?.title ?? "",
    seoDescription: page.seo?.description ?? "",
  };
}

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={"/admin/content/pages" as Route}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to pages
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">Edit page</h2>
        <p className="text-sm text-muted-foreground">{page.title}</p>
      </div>
      <PageForm initial={toFormInitial(page)} />
    </div>
  );
}
