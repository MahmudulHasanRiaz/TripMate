import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { getHelpArticle } from "@/modules/help/articles";
import { ProseMarkdown } from "@/components/site/ProseMarkdown";

export const instant = false;

export async function generateMetadata(
  props: PageProps<"/admin/help/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  return { title: article ? `${article.title} · Help` : "Help" };
}

export default async function AdminHelpArticlePage(
  props: PageProps<"/admin/help/[slug]">,
) {
  await requirePermission("orders.view");
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/help"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        সব নির্দেশনা
      </Link>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {article.section}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{article.title}</h1>
      </header>
      <ProseMarkdown>{article.body}</ProseMarkdown>
    </div>
  );
}
