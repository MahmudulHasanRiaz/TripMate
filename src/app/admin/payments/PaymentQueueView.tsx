"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { PaymentView } from "@/modules/payments/service";
import type { PaymentStatus } from "@/modules/payments/validation";
import { rejectPaymentAction, verifyPaymentAction } from "@/modules/payments/actions";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PaymentQueueViewProps = {
  items: PaymentView[];
  total: number;
  page: number;
  totalPages: number;
  currentStatus: string;
};

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All Submissions", value: "all" },
  { label: "Submitted (Needs Review)", value: "submitted" },
  { label: "Pending (Pay Later)", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
];

export default function PaymentQueueView({
  items,
  total,
  page,
  totalPages,
  currentStatus,
}: PaymentQueueViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const makeParams = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    return params.toString();
  };

  // Dialog states
  const [verifyTarget, setVerifyTarget] = useState<PaymentView | null>(null);
  const [verifyNote, setVerifyNote] = useState("");

  const [rejectTarget, setRejectTarget] = useState<PaymentView | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);

  // Global notice / error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleVerify = () => {
    if (!verifyTarget) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await verifyPaymentAction({
          id: verifyTarget.id,
          note: verifyNote.trim() || undefined,
        });

        if (res.ok) {
          setSuccessNotice(`Payment for order ${verifyTarget.orderNo} verified successfully.`);
          setVerifyTarget(null);
          setVerifyNote("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to verify payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while verifying payment.");
      }
    });
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectNote.trim()) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await rejectPaymentAction({
          id: rejectTarget.id,
          note: rejectNote.trim(),
        });

        if (res.ok) {
          setSuccessNotice(`Payment for order ${rejectTarget.orderNo} rejected.`);
          setRejectTarget(null);
          setRejectNote("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to reject payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while rejecting payment.");
      }
    });
  };

  const getStatusBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case "verified":
        return "success";
      case "submitted":
        return "warning";
      case "rejected":
        return "destructive";
      case "pending":
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const isSelected = (currentStatus || "all") === f.value;
          return (
            <Button
              key={f.value}
              asChild
              variant={isSelected ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-xs font-medium ${
                isSelected ? "bg-secondary text-foreground shadow-xs font-semibold" : "text-muted-foreground"
              }`}
            >
              <Link href={`/admin/payments?${makeParams(f.value, 1)}` as Route}>
                {f.label}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* Notice messages */}
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Payments Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px] text-xs font-semibold">Order #</TableHead>
              <TableHead className="text-xs font-semibold">Customer</TableHead>
              <TableHead className="text-xs font-semibold">Gateway</TableHead>
              <TableHead className="text-xs font-semibold">Amount</TableHead>
              <TableHead className="text-xs font-semibold">Transaction ID</TableHead>
              <TableHead className="text-xs font-semibold">Sender Number</TableHead>
              <TableHead className="text-xs font-semibold">Proof</TableHead>
              <TableHead className="text-xs font-semibold">Submitted</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="w-[140px] text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                  No payments found in this queue.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="font-mono font-bold">
                    <Link
                      href={`/admin/orders/${p.orderId}` as Route}
                      className="hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {p.orderNo}
                      <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{p.customerName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.gatewayName || "Manual Entry"}</div>
                    {p.gatewayKind ? (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {p.gatewayKind}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-foreground">
                    {formatMoney(p.amount, p.currency)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] font-semibold">
                    {p.methodTxnId || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {p.senderNumber || "—"}
                  </TableCell>
                  <TableCell>
                    {p.screenshotUrl ? (
                      <button
                        type="button"
                        onClick={() => setScreenshotPreviewUrl(p.screenshotUrl)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <ImageIcon className="size-3.5" aria-hidden="true" />
                        View Slip
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(p.status)} className="capitalize text-[10px]">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "submitted" || p.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVerifyTarget(p);
                            setVerifyNote("");
                          }}
                          disabled={isPending}
                          className="h-7 px-2 text-[11px] text-success border-success/30 hover:bg-success/10 hover:text-success"
                        >
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectTarget(p);
                            setRejectNote("");
                          }}
                          disabled={isPending}
                          className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">
                        {p.status === "verified" ? "Confirmed" : "Closed"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> payments
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/admin/payments?${makeParams(currentStatus, page - 1)}` as Route}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/admin/payments?${makeParams(currentStatus, page + 1)}` as Route}>
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Verify Dialog */}
      <Dialog open={Boolean(verifyTarget)} onOpenChange={(open) => !open && setVerifyTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Verify Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirming this payment marks it as verified. If this payment satisfies the order quote, the order will advance to confirmed.
            </DialogDescription>
          </DialogHeader>

          {verifyTarget ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-mono font-bold text-foreground">{verifyTarget.orderNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium text-foreground">{verifyTarget.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-mono font-bold text-success">
                    {formatMoney(verifyTarget.amount, verifyTarget.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {verifyTarget.methodTxnId || "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="verify-note" className="text-xs font-medium">
                  Verification Note <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="verify-note"
                  placeholder="e.g. Bank statement checked, matched reference."
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVerifyTarget(null)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleVerify}
              disabled={isPending}
              className="h-9 text-xs bg-success text-success-foreground hover:bg-success/90"
            >
              {isPending ? "Verifying..." : "Confirm Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject AlertDialog */}
      <AlertDialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <XCircle className="size-4" aria-hidden="true" />
              Reject Payment Submission
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Provide a mandatory rejection reason. The customer will receive this explanation via email so they can rectify and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="queue-reject-note" className="text-xs font-medium">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="queue-reject-note"
              placeholder="e.g. Transaction ID was not found in our ledger. Please verify and re-send."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="h-9 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectNote.trim() || isPending}
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Rejecting..." : "Reject Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Screenshot Preview Dialog */}
      <Dialog
        open={Boolean(screenshotPreviewUrl)}
        onOpenChange={(open) => !open && setScreenshotPreviewUrl(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Payment Receipt Proof</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {screenshotPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={screenshotPreviewUrl}
                alt="Payment proof screenshot"
                className="max-h-[70vh] w-full rounded-lg object-contain border border-border bg-secondary/20"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
