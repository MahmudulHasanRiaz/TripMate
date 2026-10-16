"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { savePaymentSettingsAction } from "@/modules/payments/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { PaymentSettings } from "@/modules/payments/validation";

/** Payments & Gateways section (§2.8): txn requirement + partial-payment allowance. */
export default function PaymentSettingsCard({ initial }: { initial: PaymentSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const [flags, setFlags] = useState(initial);

  const save = () => {
    startTransition(async () => {
      const res = await savePaymentSettingsAction(flags);
      if (res.ok) {
        toast({ title: "Payment settings saved" });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Could not save", description: res.error });
      }
    });
  };

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Payment rules</CardTitle>
        <CardDescription className="text-xs">Customer submission rules for manual gateway payments.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Require transaction ID</p>
            <p className="text-xs text-muted-foreground">When off, customers may submit without a txn reference.</p>
          </div>
          <Switch
            checked={flags.requireTxnId}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, requireTxnId: v }))}
            aria-label="Require transaction ID"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Allow partial payments</p>
            <p className="text-xs text-muted-foreground">Customers may pay the total across multiple submissions.</p>
          </div>
          <Switch
            checked={flags.allowCustomerPartialPayments}
            onCheckedChange={(v) => setFlags((f) => ({ ...f, allowCustomerPartialPayments: v }))}
            aria-label="Allow partial payments"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={busy} size="sm" className="h-9 text-xs">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save payment rules
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 text-xs">
            <Link href="/admin/payments/gateways">Manage gateways</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
