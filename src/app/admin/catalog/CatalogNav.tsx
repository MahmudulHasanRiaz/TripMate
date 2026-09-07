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
    <nav aria-label="Catalog sections" className="border-b border-border">
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
