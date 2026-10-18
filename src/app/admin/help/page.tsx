import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { listHelpArticles } from "@/modules/help/articles";
import SectionHeader from "@/components/admin/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help · TripMate Admin",
};

export const instant = false;

export default async function AdminHelpPage() {
  await requirePermission("orders.view");
  const articles = listHelpArticles();
  const sections = [...new Set(articles.map((a) => a.section))];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="সহায়তা কেন্দ্র"
        description="প্রতিটি অংশ কীভাবে চালাবেন — সহজ বাংলায় ধাপে ধাপে নির্দেশনা।"
        icon={BookOpen}
        accent="var(--c-orange)"
      />
      {sections.map((section) => (
        <div key={section} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {articles
              .filter((a) => a.section === section)
              .map((article) => (
                <Card key={article.slug} className="shadow-xs">
                  <CardContent className="p-4">
                    <Link
                      href={`/admin/help/${article.slug}`}
                      className="flex items-center gap-2.5 text-sm font-medium hover:text-primary"
                    >
                      <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {article.title}
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
