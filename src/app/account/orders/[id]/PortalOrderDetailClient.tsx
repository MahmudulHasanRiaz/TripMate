"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Send,
  Users,
} from "lucide-react";
import type { MyOrderDetail } from "@/modules/portal/service";
import type { GatewayView } from "@/modules/payments/service";
import type { OrderStatus } from "@/modules/bookings/validation";
import {
  selectPayLaterAction,
  submitMyPaymentAction,
} from "@/modules/payments/actions";
import { formatMoney } from "@/components/site/currency";
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

type PortalOrderDetailClientProps = {
  order: MyOrderDetail;
  gateways: GatewayView[];
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending Review",
  in_review: "In Review",
  quoted: "Quote Ready",
  confirmed: "Booking Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  in_review: "info",
  quoted: "info",
  confirmed: "success",
  completed: "default",
  cancelled: "destructive",
};

export default function PortalOrderDetailClient({
  order,
  gateways,
}: PortalOrderDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Payment form state
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>(
    gateways.length > 0 ? gateways[0].id : "",
  );
  const [methodTxnId, setMethodTxnId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [note, setNote] = useState("");

  // Notices
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const selectedGateway = gateways.find((g) => g.id === selectedGatewayId);
  const isPayLater = selectedGateway?.kind === "paylater";
  const isPayable = order.status === "quoted" || order.status === "confirmed";

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!selectedGatewayId) {
      setErrorMessage("Please select a payment gateway.");
      return;
    }

    if (!methodTxnId.trim()) {
      setErrorMessage("Transaction ID is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitMyPaymentAction({
          orderId: order.id,
          gatewayId: selectedGatewayId,
          methodTxnId: methodTxnId.trim(),
          senderNumber: senderNumber.trim() || undefined,
          screenshotUrl: screenshotUrl.trim() || undefined,
          note: note.trim() || undefined,
        });

        if (res.ok) {
          setSuccessNotice("Your payment has been submitted for verification!");
          setMethodTxnId("");
          setSenderNumber("");
          setScreenshotUrl("");
          setNote("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to submit payment.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while submitting payment.");
      }
    });
  };

  const handleSelectPayLater = () => {
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await selectPayLaterAction({ orderId: order.id });
        if (res.ok) {
          setSuccessNotice("Payment preference recorded: our team will contact you to coordinate offline payment.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to register pay later request.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground">
            <Link href="/account/orders">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              All Orders
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-base font-bold text-foreground">{order.orderNo}</span>
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            {order.type}
          </Badge>
          <Badge variant={STATUS_BADGE_VARIANTS[order.status]} className="capitalize text-xs">
            {STATUS_TITLES[order.status]}
          </Badge>
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          Placed {new Date(order.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Global Notices */}
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

      {/* 2-Column Responsive Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Snapshot & Overview */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {order.listingSnapshot?.title || "Service Inquiry"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Order Reference</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">{order.orderNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {order.listingSnapshot?.durationDays != null
                      ? `${order.listingSnapshot.durationDays} days`
                      : "Custom"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Primary Contact</span>
                  <p className="font-semibold text-foreground mt-0.5">{order.customer.name}</p>
                </div>
              </div>

              {order.listingSnapshot ? (
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Link href={`/packages/${order.listingSnapshot.slug}`} target="_blank">
                      View Package Overview
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Travelers Manifest (if any) */}
          {order.travelers.length > 0 ? (
            <Card className="shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                  Traveler Manifest ({order.travelers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Traveler Name</TableHead>
                      <TableHead className="text-xs font-semibold">Passport No.</TableHead>
                      <TableHead className="text-xs font-semibold">Relation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.travelers.map((t, idx) => (
                      <TableRow key={t.id || idx} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">{t.name}</TableCell>
                        <TableCell className="font-mono">{t.passportNo || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{t.relation || "Self"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {/* Payment Block */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Banknote className="size-4 text-primary" aria-hidden="true" />
                Payment & Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial Status Bar */}
              <div className="grid gap-3 sm:grid-cols-3 rounded-lg border border-border bg-secondary/30 p-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Quoted Total
                  </span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {order.quotedPrice != null
                      ? formatMoney(order.quotedPrice, order.currency)
                      : "Pending Quote"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Paid Total (Verified)
                  </span>
                  <p className="font-mono text-base font-bold text-success mt-0.5">
                    {formatMoney(order.paidTotal, order.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Remaining Balance
                  </span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {order.quotedPrice != null
                      ? formatMoney(Math.max(0, order.quotedPrice - order.paidTotal), order.currency)
                      : "—"}
                  </p>
                </div>
              </div>

              {isPayable ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Select Payment Method
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how you would like to transfer funds.
                    </p>
                  </div>

                  {gateways.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No active payment gateways are available right now. Please reach out to your advisor directly.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Gateway Select — only manually-payable kinds offer a txn
                          submission; sslcommerz (automatic, not yet implemented)
                          is shown disabled so the form never fails server-side. */}
                      <Select value={selectedGatewayId} onValueChange={setSelectedGatewayId}>
                        <SelectTrigger className="min-h-11 text-sm font-medium">
                          <SelectValue placeholder="Choose payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {gateways.map((gw) => (
                            <SelectItem
                              key={gw.id}
                              value={gw.id}
                              disabled={gw.kind === "sslcommerz"}
                            >
                              {gw.name}
                              {gw.kind === "sslcommerz" ? " (online payment coming soon)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Instructions & Display Config */}
                      {selectedGateway ? (
                        <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                          {selectedGateway.instructions ? (
                            <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                              {selectedGateway.instructions}
                            </p>
                          ) : null}

                          {Object.keys(selectedGateway.config || {}).length > 0 ? (
                            <dl className="grid gap-2 sm:grid-cols-2 text-xs border-t border-border/50 pt-2 font-mono">
                              {Object.entries(selectedGateway.config).map(([k, v]) => (
                                <div key={k}>
                                  <dt className="text-muted-foreground capitalize">{k}:</dt>
                                  <dd className="font-bold text-foreground mt-0.5">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Pay Later Option */}
                      {isPayLater ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-muted-foreground">
                            Opt to settle payment later with your advisor before ticket issuance.
                          </p>
                          <Button
                            type="button"
                            onClick={handleSelectPayLater}
                            disabled={isPending}
                            className="min-h-11 w-full bg-primary text-primary-foreground"
                          >
                            {isPending ? "Confirming..." : "Confirm Pay Later"}
                          </Button>
                        </div>
                      ) : (
                        /* Manual Payment Submission Form */
                        <form onSubmit={handleSubmitPayment} className="space-y-3.5 pt-1">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label htmlFor="cust-method-txnid" className="text-xs font-medium">
                                Transaction ID / TrxID <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="cust-method-txnid"
                                placeholder="e.g. 9J29DK12 or Bank Ref #"
                                value={methodTxnId}
                                onChange={(e) => setMethodTxnId(e.target.value)}
                                className="min-h-11 font-mono text-sm"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cust-sender-number" className="text-xs font-medium">
                                Sender Mobile / Account Number (optional)
                              </Label>
                              <Input
                                id="cust-sender-number"
                                placeholder="+880 1700-000000"
                                value={senderNumber}
                                onChange={(e) => setSenderNumber(e.target.value)}
                                className="min-h-11 font-mono text-sm"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cust-screenshot-url" className="text-xs font-medium">
                                Deposit Slip / Screenshot Link (optional)
                              </Label>
                              <Input
                                id="cust-screenshot-url"
                                placeholder="https://..."
                                value={screenshotUrl}
                                onChange={(e) => setScreenshotUrl(e.target.value)}
                                className="min-h-11 text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="cust-note" className="text-xs font-medium">
                              Note / Memo (optional)
                            </Label>
                            <Textarea
                              id="cust-note"
                              placeholder="Any specific instructions regarding this payment..."
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          </div>

                          <Button
                            type="submit"
                            disabled={isPending}
                            className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                                Submitting for Verification...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 size-4" aria-hidden="true" />
                                Submit Payment Proof
                              </>
                            )}
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ) : order.status === "pending" || order.status === "in_review" ? (
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
                  <Info className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-foreground">Your booking is under review</p>
                    <p className="mt-0.5">
                      Our advisors are checking itinerary availability and preparing your custom quote. Payment options will unlock as soon as your quote is issued.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  This order is {STATUS_TITLES[order.status].toLowerCase()}. No further payments are required.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment History Table */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Method</TableHead>
                    <TableHead className="text-xs font-semibold">Amount</TableHead>
                    <TableHead className="text-xs font-semibold">Transaction ID</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                        No payments recorded for this order yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.payments.map((p) => (
                      <TableRow key={p.id} className="text-xs">
                        <TableCell className="font-medium">{p.gatewayName || "Manual"}</TableCell>
                        <TableCell className="font-mono font-semibold">
                          {formatMoney(p.amount, p.currency)}
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          {p.methodTxnId || "—"}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Status Timeline Sidebar (1 col) */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Status Timeline</CardTitle>
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
                          {event.fromStatus ? `${STATUS_TITLES[event.fromStatus]} → ` : "Order Placed: "}
                          {STATUS_TITLES[event.toStatus]}
                        </span>
                      </div>
                      <time className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                        {new Date(event.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Need help card */}
          <Card className="shadow-xs bg-secondary/30 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="size-3.5" aria-hidden="true" />
                Need Assistance?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                Have questions about your itinerary or payment schedule? Contact your personal advisor directly or call our customer hotline.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
