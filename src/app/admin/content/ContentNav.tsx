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
    <nav
      aria-label="Content sections"
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-[10px] border border-border bg-secondary/40 p-1"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,20,.08)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
