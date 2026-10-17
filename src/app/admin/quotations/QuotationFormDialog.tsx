"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Calculator } from "lucide-react";
import { saveQuotationAction } from "@/modules/bookings/quotations-actions";
import type { QuotationDetail } from "@/modules/bookings/quotations-service";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CustomerPickerField from "@/components/admin/CustomerPickerField";
import PackagePickerField from "@/components/admin/PackagePickerField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LineItemState = {
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type QuotationPrefill = {
  leadId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  notes?: string | null;
};

export default function QuotationFormDialog({
  quotation,
  prefill,
  open,
  onOpenChange,
}: {
  quotation?: QuotationDetail | null;
  prefill?: QuotationPrefill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(
    quotation?.customerName ?? prefill?.customerName ?? "",
  );
  const [customerPhone, setCustomerPhone] = useState(
    quotation?.customerPhone ?? prefill?.customerPhone ?? "",
  );
  const [customerEmail, setCustomerEmail] = useState(
    quotation?.customerEmail ?? prefill?.customerEmail ?? "",
  );
  const [notes, setNotes] = useState(quotation?.notes ?? prefill?.notes ?? "");
  const [validUntil, setValidUntil] = useState(
    quotation?.validUntil ? new Date(quotation.validUntil).toISOString().split("T")[0] : "",
  );

  const [items, setItems] = useState<LineItemState[]>(
    quotation?.items && quotation.items.length > 0
      ? quotation.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          unitCost: i.unitCost,
        }))
      : [
          {
            description: "Custom Travel Package / Flight & Hotel Itinerary",
            quantity: 1,
            unitPrice: 50000,
            unitCost: 42000,
          },
        ],
  );

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, unitCost: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = <K extends keyof LineItemState>(
    index: number,
    field: K,
    value: LineItemState[K],
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  // Calculations
  const totalPrice = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const totalCost = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
  const grossProfit = totalPrice - totalCost;
  const marginPercent = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await saveQuotationAction({
        id: quotation?.id,
        leadId: quotation?.leadId ?? prefill?.leadId ?? null,
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim() || null,
        notes: notes.trim() || null,
        validUntil: validUntil || null,
        items,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quotation ? `Edit Quotation ${quotation.quoteNo}` : "Create New Quotation"}
          </DialogTitle>
          <DialogDescription>
            Build a multi-item price proposal for B2C travelers or corporate inquiries with live margin calculation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="customerName">Customer / Company Name *</Label>
              <CustomerPickerField
                id="customerName"
                value={customerName}
                onChange={setCustomerName}
                onSelectCustomer={(c) => {
                  setCustomerName(c.name);
                  if (c.phone) setCustomerPhone(c.phone);
                  if (c.email) setCustomerEmail(c.email);
                }}
                placeholder="Search directory or enter walk-in..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">Phone Number *</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 01711223344"
                className="h-10 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. rahim@example.com"
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Proposal Notes / Terms</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Includes 4-star hotel, visa fees, and private airport transfers..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">Quotation Line Items</Label>
                <p className="text-[11px] text-muted-foreground">
                  Add items manually or select packages directly from the catalog.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-56 sm:w-64">
                  <PackagePickerField
                    value={null}
                    onChange={(_, pkg) => {
                      if (pkg) {
                        setItems((prev) => [
                          ...prev,
                          {
                            description: pkg.title,
                            quantity: 1,
                            unitPrice: pkg.price ?? 0,
                            unitCost: pkg.costPrice ?? Math.round((pkg.price ?? 0) * 0.85),
                          },
                        ]);
                      }
                    }}
                    placeholder="+ Insert from catalog..."
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1 text-xs h-10"
                >
                  <Plus className="size-3.5" />
                  Custom Item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-2 rounded-xl border border-border bg-muted/20 p-3 items-end"
                >
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Description
                    </span>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      placeholder="e.g. Dubai 5-Day Deluxe Tour package"
                      required
                    />
                  </div>

                  <div className="w-20 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Qty</span>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)
                      }
                      required
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Sale Price (BDT)
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Cost Price (BDT)
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unitCost}
                      onChange={(e) =>
                        handleItemChange(index, "unitCost", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="w-28 text-right self-center pt-3 sm:pt-0">
                    <div className="text-xs font-semibold text-foreground">
                      {formatMoney(item.quantity * item.unitPrice)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Cost: {formatMoney(item.quantity * item.unitCost)}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={items.length <= 1}
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Summary Card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              <div>
                <div className="text-sm font-semibold text-foreground">Commercial Margin</div>
                <div className="text-xs text-muted-foreground">
                  Profit margin is private to operators and never shown on customer PDFs.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="text-sm font-semibold text-muted-foreground">
                  {formatMoney(totalCost)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Gross Profit</div>
                <div className="text-sm font-bold text-success">
                  {formatMoney(grossProfit)} ({marginPercent.toFixed(1)}%)
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Quote Total</div>
                <div className="text-lg font-extrabold text-primary">
                  {formatMoney(totalPrice)}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {quotation ? "Update Quotation" : "Save Quotation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
