"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

/**
 * Content section sub-navigation (Posts / Categories / Pages). The sidebar has
 * a single "Content" entry, so this local tab row lets an editor hop between
 * the three entity managers without leaving the section. Active state follows
 * the pathname so URL-driven state (filters, ?id=) stays deep-linkable.
 */
const TABS: { href: string; label: string }[] = [
  { href: "/admin/content/posts", label: "Posts" },
  { href: "/admin/content/categories", label: "Categories" },
  { href: "/admin/content/pages", label: "Pages" },
];

export function ContentNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Content sections" className="border-b border-border">
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href as Route}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
