"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  Send,
  User,
  XCircle,
  Loader2,
  Edit,
  ShoppingCart,
  ShieldAlert,
} from "lucide-react";
import type { QuotationDetail } from "@/modules/bookings/quotations-service";
import type { QuotationStatus } from "@/modules/bookings/quotations-validation";
import {
  acceptQuotationAction,
  updateQuotationStatusAction,
  convertQuotationToOrderAction,
} from "@/modules/bookings/quotations-actions";
import { formatMoney } from "@/components/site/currency";
import QuotationFormDialog from "../QuotationFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function QuotationDetailView({
  quotation,
}: {
  quotation: QuotationDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleStatusChange = (newStatus: QuotationStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await updateQuotationStatusAction({
        id: quotation.id,
        status: newStatus,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  /** Staff records acceptance on the customer's behalf (§2.7: who + when). */
  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptQuotationAction({ id: quotation.id, status: "accepted" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleConvertToOrder = () => {
    if (
      !confirm(
        "Convert this accepted quotation into an active customer order? This will create a live order in the operations database.",
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await convertQuotationToOrderAction({
        quotationId: quotation.id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/orders/${res.data.orderId}` as Route);
    });
  };

  const marginPercent =
    quotation.totalPrice > 0
      ? (quotation.grossProfit / quotation.totalPrice) * 100
      : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={"/admin/quotations" as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Quotations
        </Link>
        <div className="flex items-center gap-2">
          {quotation.status !== "converted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Edit className="size-3.5" /> Edit Proposal
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <ShieldAlert className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Converted Order Banner */}
      {quotation.convertedOrderId && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="font-semibold text-foreground">
                Quotation Successfully Converted
              </div>
              <div className="text-xs text-muted-foreground">
                Order {quotation.convertedOrderNo ?? "ORD-XXXX"} is now active in sales operations.
              </div>
            </div>
          </div>
          <Link
            href={`/admin/orders/${quotation.convertedOrderId}` as Route}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
          >
            View Active Order <ExternalLink className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {quotation.quoteNo}
              </h1>
              <Badge
                variant={quotation.status === "converted" ? "default" : "outline"}
                className="text-xs font-semibold capitalize"
              >
                {quotation.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created on {new Date(quotation.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {quotation.validUntil && (
                <> · Valid until {new Date(quotation.validUntil).toLocaleDateString("en-GB")}</>
              )}
              {quotation.acceptedAt && (
                <>
                  {" "}· Accepted{" "}
                  {new Date(quotation.acceptedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {quotation.acceptedBy ? ` by ${quotation.acceptedBy}` : ""}
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {quotation.status === "draft" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("sent")}
                disabled={isPending}
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              >
                <Send className="size-3.5" /> Mark as Sent
              </Button>
            )}

            {(quotation.status === "draft" || quotation.status === "sent") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAccept}
                disabled={isPending}
                className="gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="size-3.5" /> Record Acceptance
              </Button>
            )}

            {quotation.status === "accepted" && !quotation.convertedOrderId && (
              <Button
                onClick={handleConvertToOrder}
                disabled={isPending}
                className="gap-2 bg-primary text-primary-foreground font-bold text-xs shadow-md"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShoppingCart className="size-4" />
                )}
                Convert to Confirmed Order
              </Button>
            )}

            {quotation.status !== "rejected" && quotation.status !== "converted" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange("rejected")}
                disabled={isPending}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <XCircle className="size-3.5 mr-1" /> Reject
              </Button>
            )}
          </div>
        </div>

        {/* Customer & Lead Details */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5" /> Customer Name
            </span>
            <div className="font-semibold text-foreground text-sm">
              {quotation.customerName}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" /> Contact Phone
            </span>
            <div className="font-medium text-foreground text-sm">
              {quotation.customerPhone}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3.5" /> Email Address
            </span>
            <div className="font-medium text-foreground text-sm">
              {quotation.customerEmail || "Not specified"}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="font-semibold text-base text-foreground">
            Quotation Breakdown & Cost Analysis
          </h2>
          <span className="text-xs text-muted-foreground">
            {quotation.items.length} line {quotation.items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 pl-6 pr-3">Item Description</th>
                <th className="px-3 py-3 text-center">Qty</th>
                <th className="px-3 py-3 text-right">Sale Price</th>
                <th className="px-3 py-3 text-right">Sale Total</th>
                <th className="px-3 py-3 text-right text-muted-foreground">Unit Cost</th>
                <th className="px-3 py-3 text-right text-muted-foreground">Total Cost</th>
                <th className="py-3 pl-3 pr-6 text-right">Line Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {quotation.items.map((it) => {
                const lineProfit = it.totalPrice - it.totalCost;
                return (
                  <tr key={it.id} className="hover:bg-muted/10">
                    <td className="py-4 pl-6 pr-3 font-medium text-foreground max-w-sm">
                      {it.description}
                    </td>
                    <td className="px-3 py-4 text-center font-mono">{it.quantity}</td>
                    <td className="px-3 py-4 text-right font-mono">
                      {formatMoney(it.unitPrice)}
                    </td>
                    <td className="px-3 py-4 text-right font-bold text-foreground font-mono">
                      {formatMoney(it.totalPrice)}
                    </td>
                    <td className="px-3 py-4 text-right text-muted-foreground font-mono text-xs">
                      {formatMoney(it.unitCost)}
                    </td>
                    <td className="px-3 py-4 text-right text-muted-foreground font-mono text-xs">
                      {formatMoney(it.totalCost)}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {formatMoney(lineProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="border-t border-border bg-muted/30 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="max-w-md">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Terms & Proposal Notes
              </div>
              <p className="mt-1 text-xs text-foreground whitespace-pre-line">
                {quotation.notes || "Standard agency booking and cancellation terms apply."}
              </p>
            </div>

            <div className="w-full sm:w-80 space-y-2 border-t sm:border-t-0 pt-4 sm:pt-0">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Operational Cost:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatMoney(quotation.totalCost)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Expected Gross Profit:</span>
                <span className="font-mono font-bold">
                  {formatMoney(quotation.grossProfit)} ({marginPercent.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-primary border-t border-border pt-2">
                <span>Total Quoted Amount:</span>
                <span className="font-mono">{formatMoney(quotation.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuotationFormDialog
        quotation={quotation}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
