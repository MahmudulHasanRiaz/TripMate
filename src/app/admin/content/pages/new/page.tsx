import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import PageForm, { type PageFormInitial } from "../PageForm";

export const metadata: Metadata = { title: "New page · Content" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

function emptyFormInitial(): PageFormInitial {
  return {
    title: "",
    slug: "",
    status: "draft",
    sections: [{ content: "" }],
    seoTitle: "",
    seoDescription: "",
  };
}

export default async function NewPagePage() {
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
        <h2 className="text-lg font-semibold tracking-tight">New page</h2>
        <p className="text-sm text-muted-foreground">
          Create a static page. It stays a draft until you publish it.
        </p>
      </div>
      <PageForm initial={emptyFormInitial()} />
    </div>
  );
}
