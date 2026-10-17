"use client";

import { useState, useId } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { slugify } from "@/modules/catalog/validation";
import { saveVisaServiceAction } from "@/modules/catalog/visa-actions";
import type { VisaServiceWithRefs } from "@/modules/catalog/visa-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VisaServiceFormDialog({
  service,
  destinations,
  visaTypes,
  open,
  onCancel,
  onSaved,
}: {
  service: VisaServiceWithRefs | null;
  destinations: { id: string; name: string }[];
  visaTypes: { id: string; name: string }[];
  open: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const editing = service !== null;

  const [destinationId, setDestinationId] = useState(
    service?.destinationId ?? (destinations[0]?.id || ""),
  );
  const [visaTypeId, setVisaTypeId] = useState(
    service?.visaTypeId ?? (visaTypes[0]?.id || ""),
  );
  const [title, setTitle] = useState(service?.title ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [price, setPrice] = useState(service?.price !== undefined ? String(service.price) : "");
  const [costPrice, setCostPrice] = useState(
    service?.costPrice !== null && service?.costPrice !== undefined
      ? String(service.costPrice)
      : "",
  );
  const [processingTime, setProcessingTime] = useState(service?.processingTime ?? "");
  const [validity, setValidity] = useState(service?.validity ?? "");
  const [stayDuration, setStayDuration] = useState(service?.stayDuration ?? "");
  const [requirements, setRequirements] = useState<string[]>(
    service?.requirements?.length ? [...service.requirements] : [""],
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rootError, setRootError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const priceNum = Number(price) || 0;
  const costNum = costPrice ? Number(costPrice) : 0;
  const grossProfit = priceNum > 0 && costNum > 0 ? priceNum - costNum : null;
  const marginPercent =
    grossProfit !== null && priceNum > 0
      ? Math.round((grossProfit / priceNum) * 1000) / 10
      : null;

  const handleTitle = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      const generated = slugify(val);
      if (generated) setSlug(generated);
    }
  };

  const handleRequirementChange = (idx: number, text: string) => {
    setRequirements((prev) => {
      const next = [...prev];
      next[idx] = text;
      return next;
    });
  };

  const addRequirement = () => {
    setRequirements((prev) => [...prev, ""]);
  };

  const removeRequirement = (idx: number) => {
    setRequirements((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRootError(null);
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!destinationId) fieldErrors.destinationId = "Select a destination";
    if (!visaTypeId) fieldErrors.visaTypeId = "Select a visa type";
    if (!title.trim()) fieldErrors.title = "Title is required";
    if (!slug.trim()) fieldErrors.slug = "Slug is required";
    if (!price || Number(price) <= 0) fieldErrors.price = "Enter a valid positive price";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const cleanRequirements = requirements
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    setBusy(true);
    try {
      const res = await saveVisaServiceAction({
        id: service?.id,
        destinationId,
        visaTypeId,
        title: title.trim(),
        slug: slug.trim(),
        price: Number(price),
        costPrice: costPrice.trim() ? Number(costPrice) : null,
        processingTime: processingTime.trim() || null,
        validity: validity.trim() || null,
        stayDuration: stayDuration.trim() || null,
        requirements: cleanRequirements,
        description: description.trim() || null,
        isActive,
      });

      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          setErrors({ slug: res.error });
        } else {
          setRootError(res.error);
        }
        return;
      }

      onSaved();
    } catch {
      setRootError("Could not save visa service. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Visa Offering" : "Add New Visa Offering"}</DialogTitle>
          <DialogDescription>
            Configure destination visa rates, commercial cost, processing times, and requirement checklists.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={submit} className="space-y-4 py-2">
          {rootError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {rootError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="destinationId" className="text-[13px] font-medium text-foreground">Destination Country</Label>
              <select
                id="destinationId"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select country...</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.destinationId && (
                <p className="text-xs text-destructive">{errors.destinationId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visaTypeId" className="text-[13px] font-medium text-foreground">Visa Category / Type</Label>
              <select
                id="visaTypeId"
                value={visaTypeId}
                onChange={(e) => setVisaTypeId(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select visa type...</option>
                {visaTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name}
                  </option>
                ))}
              </select>
              {errors.visaTypeId && (
                <p className="text-xs text-destructive">{errors.visaTypeId}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[13px] font-medium text-foreground">Offering Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="e.g. Dubai 30-Day Tourist Visa"
              disabled={busy}
              className="h-10 text-sm rounded-lg border-border"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-[13px] font-medium text-foreground">Slug (URL identifier)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="dubai-30-day-tourist-visa"
              disabled={busy}
              className="h-10 text-sm rounded-lg border-border font-mono"
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
          </div>

          {/* Pricing & Commercial Margins */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 shadow-xs">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Commercial Pricing &amp; Profitability
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-[13px] font-medium text-foreground">Selling Price (BDT)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="18500"
                  disabled={busy}
                  className="h-10 text-sm rounded-lg border-border font-mono tabular-nums"
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costPrice" className="text-[13px] font-medium text-foreground">Commercial Cost / COGS (BDT)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="14800"
                  disabled={busy}
                  className="h-10 text-sm rounded-lg border-border font-mono tabular-nums"
                />
                <p className="text-xs text-muted-foreground">Direct embassy/vendor cost</p>
              </div>
            </div>

            {grossProfit !== null && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-background px-3.5 py-2.5 text-xs border border-border shadow-xs">
                <span className="text-muted-foreground font-medium">Projected Gross Profit:</span>
                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ৳{grossProfit.toLocaleString()} ({marginPercent}% margin)
                </span>
              </div>
            )}
          </div>

          {/* Processing Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="processingTime" className="text-[13px] font-medium text-foreground">Processing Time</Label>
              <Input
                id="processingTime"
                value={processingTime}
                onChange={(e) => setProcessingTime(e.target.value)}
                placeholder="3-5 Working Days"
                disabled={busy}
                className="h-10 text-sm rounded-lg border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="validity" className="text-[13px] font-medium text-foreground">Visa Validity</Label>
              <Input
                id="validity"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
                placeholder="60 Days"
                disabled={busy}
                className="h-10 text-sm rounded-lg border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stayDuration" className="text-[13px] font-medium text-foreground">Max Stay Duration</Label>
              <Input
                id="stayDuration"
                value={stayDuration}
                onChange={(e) => setStayDuration(e.target.value)}
                placeholder="30 Days Single Entry"
                disabled={busy}
                className="h-10 text-sm rounded-lg border-border"
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-medium text-foreground">Required Documents Checklist</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRequirement}
                disabled={busy}
                className="h-8 px-3 rounded-md text-xs font-medium"
              >
                <Plus className="mr-1 size-3.5" /> Add Document
              </Button>
            </div>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={req}
                    onChange={(e) => handleRequirementChange(idx, e.target.value)}
                    placeholder="e.g. Scanned copy of valid passport (min 6 months)"
                    disabled={busy}
                    className="h-10 text-sm rounded-lg border-border"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRequirement(idx)}
                    disabled={busy || requirements.length === 1}
                    className="size-10 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[13px] font-medium text-foreground">Overview / Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Important notes, embassy jurisdiction rules, or inclusion details..."
              disabled={busy}
              className="text-sm rounded-lg border-border resize-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3.5 shadow-xs">
            <div>
              <p className="text-sm font-medium text-foreground">Public Status</p>
              <p className="text-xs text-muted-foreground">
                Visible to customers in the public visa explorer
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={busy} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="h-10 px-4 rounded-lg text-sm font-medium">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Offering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
