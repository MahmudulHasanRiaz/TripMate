"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { cn } from "@/lib/utils";

/**
 * Catalog section sub-navigation (Listings / Categories / Destinations). The
 * sidebar has a single "Catalog" entry, so this local tab row lets an editor
 * hop between the three entity managers without leaving the section. Active
 * state follows the pathname so URL-driven state (filters, ?id=) stays deep-
 * linkable.
 */
const TABS: { href: string; label: string }[] = [
  { href: "/admin/catalog/listings", label: "Listings" },
  { href: "/admin/catalog/categories", label: "Categories" },
  { href: "/admin/catalog/destinations", label: "Destinations" },
  { href: "/admin/catalog/visa-services", label: "Visa Services" },
  { href: "/admin/catalog/visa-types", label: "Visa Types" },
  { href: "/admin/catalog/service-options", label: "Service Options" },
];

export function CatalogNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Catalog sections"
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
