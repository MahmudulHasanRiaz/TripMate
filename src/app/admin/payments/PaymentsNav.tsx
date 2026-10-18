"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { CheckSquare, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentsNavProps = {
  canManageGateways: boolean;
};

function pillClass(active: boolean) {
  return cn(
    "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,20,.08)]"
      : "text-muted-foreground hover:text-foreground",
  );
}

export function PaymentsNav({ canManageGateways }: PaymentsNavProps) {
  const pathname = usePathname();

  const isQueue = pathname === "/admin/payments";
  const isGateways = pathname.startsWith("/admin/payments/gateways");

  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-border bg-secondary/40 p-1">
      <Link
        href={"/admin/payments" as Route}
        aria-current={isQueue ? "page" : undefined}
        className={pillClass(isQueue)}
      >
        <CheckSquare className="size-3.5" aria-hidden="true" />
        Verification Queue
      </Link>

      {canManageGateways ? (
        <Link
          href={"/admin/payments/gateways" as Route}
          aria-current={isGateways ? "page" : undefined}
          className={pillClass(isGateways)}
        >
          <CreditCard className="size-3.5" aria-hidden="true" />
          Gateway Configuration
        </Link>
      ) : null}
    </div>
  );
}
