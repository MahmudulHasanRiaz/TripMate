"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createServiceSaleAction } from "@/modules/bookings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Services quick-create (§2.9): exactly service name, customer name,
 * customer phone, note (optional), total amount, cost amount.
 * Creates a completed service order with payment recorded.
 *
 * Fulfillment mapping: Pending → pending, In progress → confirmed,
 * Completed → completed, Cancelled → cancelled (order statuses).
 */
export default function ServicesView() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [form, setForm] = useState({
    serviceName: "",
    customerName: "",
    customerPhone: "",
    note: "",
    totalAmount: "",
    costAmount: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    const res = await createServiceSaleAction({
      serviceName: form.serviceName,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      note: form.note || undefined,
      totalAmount: Number(form.totalAmount),
      costAmount: form.costAmount === "" ? 0 : Number(form.costAmount),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Could not record the service sale.");
      return;
    }
    setCreated(res.data.orderNo);
    setForm({ serviceName: "", customerName: "", customerPhone: "", note: "", totalAmount: "", costAmount: "" });
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      <Card className="shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">Quick service sale</CardTitle>
          <CardDescription className="text-xs">
            Record an offline or generic service in one step. Payment is marked verified immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="svc-name" className="text-sm">Service name</Label>
              <Input id="svc-name" value={form.serviceName} onChange={set("serviceName")} className="h-10" required disabled={busy} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="svc-customer" className="text-sm">Customer name</Label>
                <Input id="svc-customer" value={form.customerName} onChange={set("customerName")} className="h-10" required disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-phone" className="text-sm">Customer phone</Label>
                <Input id="svc-phone" value={form.customerPhone} onChange={set("customerPhone")} className="h-10" required disabled={busy} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-note" className="text-sm">Note (optional)</Label>
              <Textarea id="svc-note" value={form.note} onChange={set("note")} rows={2} disabled={busy} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="svc-total" className="text-sm">Total amount (BDT)</Label>
                <Input id="svc-total" type="number" step="0.01" min="0" value={form.totalAmount} onChange={set("totalAmount")} className="h-10 tabular-nums" required disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-cost" className="text-sm">Cost amount (BDT)</Label>
                <Input id="svc-cost" type="number" step="0.01" min="0" value={form.costAmount} onChange={set("costAmount")} className="h-10 tabular-nums" disabled={busy} />
              </div>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            {created ? <p role="status" className="text-sm text-success">Recorded as order {created}.</p> : null}
            <Button type="submit" className="h-10 w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Record service sale
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">Fulfillment statuses</CardTitle>
          <CardDescription className="text-xs">How service progress maps to order status.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between rounded-md border border-border px-3 py-2"><span>Pending</span><span className="text-xs text-muted-foreground">order: pending</span></li>
            <li className="flex items-center justify-between rounded-md border border-border px-3 py-2"><span>In progress</span><span className="text-xs text-muted-foreground">order: confirmed</span></li>
            <li className="flex items-center justify-between rounded-md border border-border px-3 py-2"><span>Completed</span><span className="text-xs text-muted-foreground">order: completed</span></li>
            <li className="flex items-center justify-between rounded-md border border-border px-3 py-2"><span>Cancelled</span><span className="text-xs text-muted-foreground">order: cancelled</span></li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Change fulfillment from the Orders board — quick sales land completed with revenue and profit flowing straight into the dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
