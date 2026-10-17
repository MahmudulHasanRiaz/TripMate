"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  PlusCircle,
  Send,
  User,
} from "lucide-react";
import type { OrderDetail } from "@/modules/bookings/service";
import type { GatewayView, PaymentView } from "@/modules/payments/service";
import {
  ORDER_STATUSES,
  isLegalOrderTransition,
  type OrderStatus,
} from "@/modules/bookings/validation";
import {
  setQuoteAction,
  updateOrderStatusAction,
} from "@/modules/bookings/actions";
import TravelerManager from "./TravelerManager";
import {
  adminCreatePaymentAction,
  rejectPaymentAction,
  verifyPaymentAction,
} from "@/modules/payments/actions";
import { formatMoney, telLink, whatsappLink } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type OrderDetailClientProps = {
  order: OrderDetail;
  payments: PaymentView[];
  paidTotal: number;
  gateways: GatewayView[];
  canManageOrders: boolean;
  canVerifyPayments: boolean;
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  confirmed: "success",
  completed: "default",
  cancelled: "destructive",
};

export default function OrderDetailClient({
  order,
  payments,
  paidTotal,
  gateways,
  canManageOrders,
  canVerifyPayments,
}: OrderDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Status transition state
  const [selectedNextStatus, setSelectedNextStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");

  // Quote composer state
  const [quotedPriceInput, setQuotedPriceInput] = useState(
    order.quotedPrice != null ? String(order.quotedPrice) : "",
  );

  // Notifications / errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reject payment modal state
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Record payment dialog state
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [recordGatewayId, setRecordGatewayId] = useState<string>(
    gateways.length > 0 ? gateways[0].id : "",
  );
  const [recordTxnId, setRecordTxnId] = useState("");
  const [recordSenderNumber, setRecordSenderNumber] = useState("");
  const [recordNote, setRecordNote] = useState("");

  const legalNextStatuses = ORDER_STATUSES.filter((s) =>
    isLegalOrderTransition(order.status, s),
  );

  const canComposeQuote =
    canManageOrders && order.status === "pending";

  // Handle status update
  const handleStatusUpdate = () => {
    if (!selectedNextStatus) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await updateOrderStatusAction({
          id: order.id,
          status: selectedNextStatus as OrderStatus,
          note: statusNote.trim() || undefined,
        });
        if (res.ok) {
          setSuccessNotice(`Order transitioned to ${STATUS_TITLES[selectedNextStatus as OrderStatus]}.`);
          setSelectedNextStatus("");
          setStatusNote("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to update order status.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while updating status.");
      }
    });
  };

  // Handle quote save
  const handleQuoteSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const price = Number(quotedPriceInput);
    if (isNaN(price) || price <= 0) {
      setErrorMessage("Enter a valid positive quoted price.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await setQuoteAction({ id: order.id, quotedPrice: price });
        if (res.ok) {
          setSuccessNotice("Quoted price saved and quote-ready email sent to customer.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to save quote.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while setting quote.");
      }
    });
  };

  // Handle payment verify
  const handleVerifyPayment = (paymentId: string) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await verifyPaymentAction({ id: paymentId });
        if (res.ok) {
          setSuccessNotice("Payment verified successfully.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to verify payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while verifying payment.");
      }
    });
  };

  // Handle payment reject
  const handleRejectPayment = () => {
    if (!rejectPaymentId || !rejectReason.trim()) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await rejectPaymentAction({
          id: rejectPaymentId,
          note: rejectReason.trim(),
        });
        if (res.ok) {
          setSuccessNotice("Payment rejected.");
          setRejectPaymentId(null);
          setRejectReason("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to reject payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while rejecting payment.");
      }
    });
  };

  // Handle admin record offline payment — the backend derives and records the
  // full payable amount (quote), so only the transaction reference is entered
  // here; partial deposits are not supported by adminCreatePaymentAction.
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recordTxnId.trim()) {
      setErrorMessage("Transaction ID is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await adminCreatePaymentAction({
          orderId: order.id,
          gatewayId: recordGatewayId,
          methodTxnId: recordTxnId.trim(),
          senderNumber: recordSenderNumber.trim() || undefined,
          note: recordNote.trim() || undefined,
        });

        if (res.ok) {
          setRecordDialogOpen(false);
          setRecordTxnId("");
          setRecordSenderNumber("");
          setRecordNote("");
          setSuccessNotice("Payment recorded and placed in verification queue.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to record payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while recording payment.");
      }
    });
  };

  const telHref = order.customer.phone ? telLink(order.customer.phone) : null;
  const waHref = order.customer.phone ? whatsappLink(order.customer.phone) : null;

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
            <Link href="/admin/orders">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Orders
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-base font-bold tracking-tight text-foreground">
            {order.orderNo}
          </span>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
            {order.type}
          </Badge>
          <Badge variant={STATUS_BADGE_VARIANTS[order.status]} className="capitalize text-xs font-semibold">
            {STATUS_TITLES[order.status]}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>
            Created {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Global Banner Messages */}
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

      {/* 2-Column Responsive Layout: Main (2/3) + Sidebar (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Main Info (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead Provenance Banner (if converted from lead) */}
          {order.leadId ? (
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Converted from Lead</p>
                  <p className="text-xs text-muted-foreground">
                    This order was generated through direct lead conversion.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Link href={`/admin/leads/${order.leadId}` as Route}>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  View Lead
                </Link>
              </Button>
            </div>
          ) : null}

          {/* Customer Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" aria-hidden="true" />
                  Customer Information
                </span>
                {order.userName ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Account: {order.userName}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Guest Order
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {order.customer.name || "Anonymous Customer"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-mono font-medium text-foreground">
                      {order.customer.phone || "None provided"}
                    </span>
                    {telHref ? (
                      <a
                        href={telHref}
                        title="Call"
                        className="inline-flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                    {waHref ? (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
                        className="inline-flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {order.customer.email || "None provided"}
                    </span>
                    {order.customer.email ? (
                      <a
                        href={`mailto:${order.customer.email}`}
                        title="Send email"
                        className="inline-flex size-6 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="size-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Inquiry details / custom fields (if inquiry order) */}
              {order.customer.details ? (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Inquiry Details
                  </p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-secondary/30 p-3 border border-border">
                    {order.customer.details}
                  </p>
                </div>
              ) : null}

              {order.customer.extraFields && Object.keys(order.customer.extraFields).length > 0 ? (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Custom Form Answers
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-2 rounded-lg bg-secondary/20 p-3 border border-border">
                    {Object.entries(order.customer.extraFields).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <dt className="text-muted-foreground capitalize font-medium">{k.replace(/_/g, " ")}</dt>
                        <dd className="font-semibold text-foreground mt-0.5">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Travelers (any stage) */}
          <TravelerManager orderId={order.id} initial={order.travelers} canEdit={canManageOrders} />

          {/* Special Requests */}
          {order.specialRequests ? (
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Special Requests / Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {order.specialRequests}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Listing / Service Option / Quotation Snapshot */}
          {order.listingSnapshot ? (
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>
                    {order.listingSnapshot.kind === "service_option"
                      ? "Service Option at Booking"
                      : order.listingSnapshot.lineItems
                        ? "Quotation Items Snapshot"
                        : "Package Snapshot at Booking"}
                  </span>
                  {order.listingSnapshot.kind === "service_option" ? (
                    <Link
                      href={`/services/${order.listingSnapshot.categorySlug || ""}` as Route}
                      target="_blank"
                      className="text-xs text-primary hover:underline font-normal inline-flex items-center gap-1"
                    >
                      View Service
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : order.listingSnapshot.slug ? (
                    <Link
                      href={`/packages/${order.listingSnapshot.slug}` as Route}
                      target="_blank"
                      className="text-xs text-primary hover:underline font-normal inline-flex items-center gap-1"
                    >
                      View Public Page
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {order.listingSnapshot.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.listingSnapshot.kind === "service_option"
                        ? `${order.listingSnapshot.categoryName ? `Category: ${order.listingSnapshot.categoryName} · ` : ""}Duration: ${order.listingSnapshot.duration || "Standard"} · Delivery: ${order.listingSnapshot.deliveryTime || "Standard"}`
                        : `Duration: ${order.listingSnapshot.durationDays != null ? `${order.listingSnapshot.durationDays} days` : "Flexible"}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Catalog Base Price</p>
                    <p className="text-sm font-semibold font-mono text-foreground mt-0.5">
                      {order.listingSnapshot.price != null
                        ? formatMoney(order.listingSnapshot.price, order.listingSnapshot.currency)
                        : "Price on request"}
                    </p>
                  </div>
                </div>

                {order.listingSnapshot.requirements && order.listingSnapshot.requirements.length > 0 ? (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Required Documents
                    </p>
                    <ul className="space-y-1">
                      {order.listingSnapshot.requirements.map((req, i) => (
                        <li key={i} className="text-xs text-foreground flex items-center gap-2">
                          <CheckCircle2 className="size-3 text-success shrink-0" aria-hidden="true" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {order.listingSnapshot.lineItems && order.listingSnapshot.lineItems.length > 0 ? (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Line Items
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Description</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.listingSnapshot.lineItems.map((item, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="font-medium text-foreground">{item.description}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono">{formatMoney(item.unitPrice, order.currency)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatMoney(item.totalPrice, order.currency)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Per-Order Payments Block */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="size-4 text-muted-foreground" aria-hidden="true" />
                  Payments & Collections
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Track customer payments submitted or verified against this order.
                </p>
              </div>

              {canVerifyPayments ? (
                <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                      <PlusCircle className="size-3.5" aria-hidden="true" />
                      Record Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-base font-semibold">Record Offline Payment</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Record a manual transfer or cash collection received on behalf of the customer.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Payment Gateway</Label>
                        <Select value={recordGatewayId} onValueChange={setRecordGatewayId}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select gateway" />
                          </SelectTrigger>
                          <SelectContent>
                            {gateways.map((gw) => (
                              <SelectItem key={gw.id} value={gw.id} className="text-xs">
                                {gw.name} ({gw.kind})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Amount ({order.currency})</Label>
                        <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                          {order.quotedPrice != null
                            ? `${order.quotedPrice.toLocaleString()} — recorded in full (partial deposits: split via multiple quotes)`
                            : "Set a quote first — the quote amount is what gets recorded."}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="record-payment-txnid" className="text-xs font-medium">Transaction ID / Reference</Label>
                        <Input
                          id="record-payment-txnid"
                          placeholder="e.g. BKASH-TXN-12345"
                          value={recordTxnId}
                          onChange={(e) => setRecordTxnId(e.target.value)}
                          className="h-9 text-xs font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="record-payment-sender" className="text-xs font-medium">Sender Number (optional)</Label>
                        <Input
                          id="record-payment-sender"
                          placeholder="+880 1700-000000"
                          value={recordSenderNumber}
                          onChange={(e) => setRecordSenderNumber(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Internal Note (optional)</Label>
                        <Textarea
                          placeholder="Deposit details, bank branch or receipt memo..."
                          value={recordNote}
                          onChange={(e) => setRecordNote(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRecordDialogOpen(false)}
                          className="h-9 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isPending}
                          className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
                              Recording...
                            </>
                          ) : (
                            "Record Payment"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Financial Balance Summary */}
              <div className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-secondary/30 p-3.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Agreed Quote
                  </p>
                  <p className="text-sm font-semibold font-mono text-foreground mt-0.5">
                    {order.quotedPrice != null
                      ? formatMoney(order.quotedPrice, order.currency)
                      : "Not quoted"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Paid Total (Verified)
                  </p>
                  <p data-testid="paid-total" className="text-sm font-semibold font-mono text-success mt-0.5">
                    {formatMoney(paidTotal, order.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Balance Due
                  </p>
                  <p className="text-sm font-semibold font-mono text-foreground mt-0.5">
                    {order.quotedPrice != null
                      ? formatMoney(Math.max(0, order.quotedPrice - paidTotal), order.currency)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Payments Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Gateway</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Txn ID / Sender</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      {canVerifyPayments ? (
                        <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={canVerifyPayments ? 6 : 5}
                          className="h-20 text-center text-xs text-muted-foreground"
                        >
                          No payments recorded for this order yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => (
                        <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {p.gatewayName || "Manual Entry"}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {formatMoney(p.amount, p.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-[11px] text-foreground font-semibold">
                              {p.methodTxnId || "—"}
                            </div>
                            {p.senderNumber ? (
                              <div className="font-mono text-[10px] text-muted-foreground">
                                from {p.senderNumber}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.status === "verified"
                                  ? "success"
                                  : p.status === "rejected"
                                    ? "destructive"
                                    : p.status === "submitted"
                                      ? "warning"
                                      : "secondary"
                              }
                              className="capitalize text-[10px]"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </TableCell>
                          {canVerifyPayments ? (
                            <TableCell className="text-right">
                              {p.status === "submitted" || p.status === "pending" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVerifyPayment(p.id)}
                                    disabled={isPending}
                                    className="h-7 px-2 text-[11px] text-success border-success/30 hover:bg-success/10 hover:text-success"
                                  >
                                    Verify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectPaymentId(p.id);
                                      setRejectReason("");
                                    }}
                                    disabled={isPending}
                                    className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sticky Status & Quote Composer (1 col) */}
        <div className="space-y-6">
          {/* Status & Transition Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-3">
                <span className="text-xs text-muted-foreground">Current Stage</span>
                <Badge data-testid="order-status-badge" variant={STATUS_BADGE_VARIANTS[order.status]} className="capitalize font-semibold text-xs">
                  {STATUS_TITLES[order.status]}
                </Badge>
              </div>

              {canManageOrders && legalNextStatuses.length > 0 ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <Label htmlFor="order-next-status" className="text-xs font-medium">
                    Advance to Next Stage
                  </Label>
                  <Select
                    value={selectedNextStatus}
                    onValueChange={(val) => setSelectedNextStatus(val as OrderStatus)}
                  >
                    <SelectTrigger id="order-next-status" className="h-9 text-xs">
                      <SelectValue placeholder="Choose target status" />
                    </SelectTrigger>
                    <SelectContent>
                      {legalNextStatuses.map((target) => (
                        <SelectItem key={target} value={target} className="text-xs capitalize">
                          {STATUS_TITLES[target]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-1">
                    <Label htmlFor="order-status-note" className="text-xs font-medium">
                      Status Note <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="order-status-note"
                      placeholder="Reason for change, operator memo..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={!selectedNextStatus || isPending}
                    className="w-full h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
                        Updating Status...
                      </>
                    ) : (
                      "Update Order Status"
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No outgoing status transitions available from {STATUS_TITLES[order.status]}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quote Composer Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Quote Composer</span>
                <span className="text-xs font-mono font-normal text-muted-foreground">
                  {order.currency}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canComposeQuote ? (
                <form onSubmit={handleQuoteSave} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Setting a quote sets the agreed price and confirms the order from{" "}
                    <span className="font-semibold text-foreground">{order.status}</span> to{" "}
                    <span className="font-semibold text-foreground">confirmed</span>.
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="composer-price" className="text-xs font-medium">
                      Quoted Price ({order.currency})
                    </Label>
                    <Input
                      id="composer-price"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 850000"
                      value={quotedPriceInput}
                      onChange={(e) => setQuotedPriceInput(e.target.value)}
                      className="h-9 text-sm font-mono"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
                        Saving Quote...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-3.5" aria-hidden="true" />
                        Save & Issue Quote
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Current Agreed Quote
                    </p>
                    <p className="text-xl font-bold font-mono text-foreground mt-1">
                      {order.quotedPrice != null
                        ? formatMoney(order.quotedPrice, order.currency)
                        : "Not quoted"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {order.events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events logged.</p>
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-4 py-1">
                  {order.events.map((event, idx) => (
                    <li key={event.id || idx} className="ml-4">
                      <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-background bg-primary" />
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground capitalize">
                          {event.fromStatus ? `${STATUS_TITLES[event.fromStatus]} → ` : "Created as "}
                          {STATUS_TITLES[event.toStatus]}
                        </span>
                        <time className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {new Date(event.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        by {event.actorName || "System / Customer"}
                      </p>
                      {event.note ? (
                        <p className="mt-1 rounded bg-secondary/30 p-2 text-xs text-foreground border border-border/50">
                          {event.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Payment AlertDialog */}
      <AlertDialog
        open={Boolean(rejectPaymentId)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectPaymentId(null);
            setRejectReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Reject Payment Submission
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Provide a clear reason for rejecting this payment. This note will be recorded and communicated to the customer so they can re-submit with accurate transaction proof.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason" className="text-xs font-medium">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Transaction ID could not be found in our bKash statement. Please check the transaction ID and re-submit."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
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
              onClick={handleRejectPayment}
              disabled={!rejectReason.trim() || isPending}
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
