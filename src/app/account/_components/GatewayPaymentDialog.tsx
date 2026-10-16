"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building, Check, Copy, CreditCard, Loader2, Send, Smartphone } from "lucide-react";
import { selectPayLaterAction, submitMyPaymentAction } from "@/modules/payments/actions";
import type { GatewayView } from "@/modules/payments/service";
import { defaultGatewayInstructions } from "@/modules/payments/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * SSLCommerz-style gateway picker popup (§2.8):
 * step 1 — method grid → step 2 — method detail (number + copy + instructions)
 * → submit { senderNumber, txnId? }. No screenshot collection.
 */
export default function GatewayPaymentDialog({
  orderId,
  gateways,
  open,
  onOpenChange,
}: {
  orderId: string;
  gateways: GatewayView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [methodTxnId, setMethodTxnId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const gateway = gateways.find((g) => g.id === gatewayId) ?? null;
  const config = (gateway?.config ?? {}) as Record<string, string>;
  const accountNumber = config.accountNumber || config.number || "";
  const instructions =
    gateway?.instructions?.trim() ||
    (gateway
      ? defaultGatewayInstructions({
          accountNumber: accountNumber || undefined,
          accountHolder: config.accountHolder || undefined,
          mfsType:
            config.mfsType === "personal" || config.mfsType === "agent" || config.mfsType === "merchant"
              ? config.mfsType
              : null,
          bankName: config.bankName || null,
        })
      : "");
  const isPayLater = gateway?.kind === "paylater";

  const reset = () => {
    setGatewayId(null);
    setMethodTxnId("");
    setSenderNumber("");
    setNote("");
    setError(null);
    setDone(false);
    setCopied(false);
  };

  const copyNumber = async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy — select and copy manually.");
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateway) return;
    setBusy(true);
    setError(null);
    const res = await submitMyPaymentAction({
      orderId,
      gatewayId: gateway.id,
      ...(methodTxnId.trim() ? { methodTxnId: methodTxnId.trim() } : {}),
      senderNumber: senderNumber.trim() || undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to submit payment.");
      return;
    }
    setDone(true);
    router.refresh();
  };

  const confirmPayLater = async () => {
    setBusy(true);
    setError(null);
    const res = await selectPayLaterAction({ orderId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Failed to register pay later request.");
      return;
    }
    setDone(true);
    router.refresh();
  };

  const kindIcon = (kind: GatewayView["kind"]) => {
    if (kind === "bkash" || kind === "nagad") return <Smartphone className="size-5" aria-hidden="true" />;
    if (kind === "manual") return <Building className="size-5" aria-hidden="true" />;
    return <CreditCard className="size-5" aria-hidden="true" />;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {!gateway ? "Choose payment method" : gateway.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {!gateway
              ? "Pick how you want to transfer funds."
              : isPayLater
                ? "Confirm and our team will coordinate payment with you."
                : "Transfer first, then submit the details below."}
          </DialogDescription>
        </DialogHeader>

        {!gateway ? (
          <div className="grid gap-2 pt-2">
            {gateways.map((gw) => (
              <button
                key={gw.id}
                type="button"
                disabled={gw.kind === "sslcommerz"}
                onClick={() => setGatewayId(gw.id)}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
                  {kindIcon(gw.kind)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{gw.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {gw.kind === "sslcommerz" ? "Online payment coming soon" : gw.kind === "paylater" ? "Pay with advisor help" : "Manual transfer + submit details"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : done ? (
          <p role="status" className="rounded-md border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
            Submitted for verification. Our team will confirm shortly.
          </p>
        ) : isPayLater ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">{instructions || "Opt to settle payment later with your advisor before ticket issuance."}</p>
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
            <Button onClick={confirmPayLater} disabled={busy} className="min-h-11 w-full">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Confirm Pay Later
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setGatewayId(null)}>
              <ArrowLeft className="mr-1.5 size-3.5" aria-hidden="true" /> All methods
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3.5 space-y-2.5">
              {accountNumber ? (
                <button
                  type="button"
                  onClick={copyNumber}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 font-mono text-sm font-bold hover:border-primary/50"
                >
                  {copied ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  {accountNumber}
                </button>
              ) : null}
              <p className="text-xs leading-relaxed">{instructions}</p>
            </div>
            <form onSubmit={submitPayment} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gw-txn" className="text-xs font-medium">Transaction ID / TrxID</Label>
                <Input id="gw-txn" value={methodTxnId} onChange={(e) => setMethodTxnId(e.target.value)} placeholder="e.g. 9J29DK12" className="min-h-11 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gw-sender" className="text-xs font-medium">Sender number (optional)</Label>
                <Input id="gw-sender" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="+880 1700-000000" className="min-h-11 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gw-note" className="text-xs font-medium">Note (optional)</Label>
                <Textarea id="gw-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-xs" />
              </div>
              {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
              <Button type="submit" disabled={busy} className="min-h-11 w-full">
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 size-4" aria-hidden="true" />}
                Submit payment
              </Button>
            </form>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setGatewayId(null)}>
              <ArrowLeft className="mr-1.5 size-3.5" aria-hidden="true" /> All methods
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
