"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { FileText, LayoutDashboard, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const pathname = usePathname();

  const isOverview = pathname === "/account";
  const isOrders = pathname.startsWith("/account/orders");
  const isDocs = pathname.startsWith("/account/documents");

  return (
    <nav aria-label="Portal Navigation" className="flex items-center gap-1 sm:gap-2">
      <Link
        href={"/account" as Route}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          isOverview
            ? "bg-secondary text-foreground font-semibold"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        )}
      >
        <LayoutDashboard className="size-3.5" aria-hidden="true" />
        <span>Overview</span>
      </Link>

      <Link
        href={"/account/orders" as Route}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          isOrders
            ? "bg-secondary text-foreground font-semibold"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        )}
      >
        <ShoppingBag className="size-3.5" aria-hidden="true" />
        <span>My Orders</span>
      </Link>

      <Link
        href={"/account/documents" as Route}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          isDocs
            ? "bg-secondary text-foreground font-semibold"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        )}
      >
        <FileText className="size-3.5" aria-hidden="true" />
        <span>My Documents</span>
      </Link>
    </nav>
  );
}
