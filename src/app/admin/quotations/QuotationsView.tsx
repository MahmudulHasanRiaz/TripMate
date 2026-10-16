"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  ChevronRight,
} from "lucide-react";
import type { QuotationListItem } from "@/modules/bookings/quotations-service";
import type { QuotationStatus } from "@/modules/bookings/quotations-validation";
import { formatMoney } from "@/components/site/currency";
import QuotationFormDialog, { type QuotationPrefill } from "./QuotationFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_TABS: { label: string; value: QuotationStatus | "all" }[] = [
  { label: "All Proposals", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Converted", value: "converted" },
  { label: "Rejected", value: "rejected" },
];

function statusBadge(status: QuotationStatus) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
          <Clock className="mr-1 size-3" /> Draft
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          <Send className="mr-1 size-3" /> Sent
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="mr-1 size-3" /> Accepted
        </Badge>
      );
    case "converted":
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground font-semibold">
          <CheckCircle2 className="mr-1 size-3" /> Converted to Order
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 size-3" /> Rejected
        </Badge>
      );
  }
}

export default function QuotationsView({
  items,
  total,
  currentStatus,
  currentSearch,
  currentPage,
  prefill,
}: {
  items: QuotationListItem[];
  total: number;
  currentStatus?: QuotationStatus;
  currentSearch: string;
  currentPage: number;
  prefill?: QuotationPrefill | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [createOpen, setCreateOpen] = useState(Boolean(prefill));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/admin/quotations?${params.toString()}` as Route);
  };

  const handleTabChange = (status: QuotationStatus | "all") => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    router.push(`/admin/quotations?${params.toString()}` as Route);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Custom Quotations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            B2B proposals, group itineraries, and custom agency quotations with commercial margin tracking.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Create Quotation
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 border-b border-border sm:border-0 pb-2 sm:pb-0">
          {STATUS_TABS.map((tab) => {
            const active = tab.value === "all" ? !currentStatus : currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-72">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quote #, customer..."
              className="pl-8 text-xs h-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
            Filter
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <FileSpreadsheet className="mx-auto size-12 text-muted-foreground/40" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No quotations found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentStatus || currentSearch
                ? "Try clearing your filters or search terms."
                : "Create your first quotation proposal to send to prospective travelers."}
            </p>
            {!currentStatus && !currentSearch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-4 gap-2"
              >
                <Plus className="size-4" />
                Create Proposal
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Quote #</th>
                  <th className="px-3 py-3.5">Customer</th>
                  <th className="px-3 py-3.5">Items</th>
                  <th className="px-3 py-3.5">Sale Total</th>
                  <th className="px-3 py-3.5">Gross Profit</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Created</th>
                  <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((q) => {
                  const marginPercent =
                    q.totalPrice > 0 ? (q.grossProfit / q.totalPrice) * 100 : 0;
                  return (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-semibold font-mono text-xs text-foreground">
                        <Link
                          href={`/admin/quotations/${q.id}` as Route}
                          className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                        >
                          {q.quoteNo}
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-foreground">{q.customerName}</div>
                        <div className="text-xs text-muted-foreground">{q.customerPhone}</div>
                      </td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">
                        {q.itemsCount} {q.itemsCount === 1 ? "line item" : "line items"}
                      </td>
                      <td className="px-3 py-4 font-bold text-foreground">
                        {formatMoney(q.totalPrice)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(q.grossProfit)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {marginPercent.toFixed(1)}% margin
                        </div>
                      </td>
                      <td className="px-3 py-4">{statusBadge(q.status)}</td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">
                        {new Date(q.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right">
                        <Link
                          href={`/admin/quotations/${q.id}` as Route}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Details <ChevronRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total} quotation{total === 1 ? "" : "s"}
        </span>
        <span>Page {currentPage}</span>
      </div>

      <QuotationFormDialog open={createOpen} onOpenChange={setCreateOpen} prefill={prefill ?? null} />
    </div>
  );
}
