"use client";

import { useState, useId } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { slugify } from "@/modules/catalog/validation";
import { saveServiceOptionAction } from "@/modules/catalog/visa-actions";
import type { ServiceOptionWithRef } from "@/modules/catalog/visa-service";
import type { CategoryRow } from "@/app/admin/catalog/categories/types";
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

export default function ServiceOptionFormDialog({
  option,
  categories,
  open,
  onCancel,
  onSaved,
}: {
  option: ServiceOptionWithRef | null;
  categories: CategoryRow[];
  open: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const editing = option !== null;

  const [categoryId, setCategoryId] = useState(
    option?.categoryId ?? (categories[0]?.id || ""),
  );
  const [title, setTitle] = useState(option?.title ?? "");
  const [slug, setSlug] = useState(option?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [duration, setDuration] = useState(option?.duration ?? "");
  const [price, setPrice] = useState(option?.price !== undefined ? String(option.price) : "");
  const [costPrice, setCostPrice] = useState(
    option?.costPrice !== null && option?.costPrice !== undefined
      ? String(option.costPrice)
      : "",
  );
  const [deliveryTime, setDeliveryTime] = useState(option?.deliveryTime ?? "");
  const [requirements, setRequirements] = useState<string[]>(
    option?.requirements?.length ? [...option.requirements] : [""],
  );
  const [description, setDescription] = useState(option?.description ?? "");
  const [isActive, setIsActive] = useState(option?.isActive ?? true);

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
    if (!categoryId) fieldErrors.categoryId = "Select a service category";
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
      const res = await saveServiceOptionAction({
        id: option?.id,
        categoryId,
        title: title.trim(),
        slug: slug.trim(),
        duration: duration.trim() || null,
        price: Number(price),
        costPrice: costPrice.trim() ? Number(costPrice) : null,
        deliveryTime: deliveryTime.trim() || null,
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
      setRootError("Could not save service option. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Service Tier / Option" : "Add Service Tier / Option"}</DialogTitle>
          <DialogDescription>
            Configure specific passport or travel service variations, commercial delivery timelines, and costs.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={submit} className="space-y-4 py-2">
          {rootError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {rootError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="categoryId" className="text-[13px] font-medium text-foreground">Parent Category</Label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={busy}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind})
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[13px] font-medium text-foreground">Option Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitle(e.target.value)}
                placeholder="e.g. 5 Years Validity (48 Pages)"
                className="h-10 text-sm rounded-lg border-border"
                disabled={busy}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-[13px] font-medium text-foreground">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="passport-5y-48p"
                className="h-10 text-sm rounded-lg border-border"
                disabled={busy}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            </div>
          </div>

          {/* Pricing & Commercial Margins */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Commercial Pricing & Profitability
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
                  placeholder="5500"
                  className="h-10 text-sm rounded-lg border-border tabular-nums"
                  disabled={busy}
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costPrice" className="text-[13px] font-medium text-foreground">Direct Cost / Gov Fee (BDT)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="4025"
                  className="h-10 text-sm rounded-lg border-border tabular-nums"
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">Official government/vendor cost</p>
              </div>
            </div>

            {grossProfit !== null && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-background p-3 text-xs border border-border/50">
                <span className="text-muted-foreground">Projected Gross Profit:</span>
                <span className="font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  ৳{grossProfit.toLocaleString()} ({marginPercent}% margin)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-[13px] font-medium text-foreground">Duration / Validity</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="5 Years / 10 Years"
                className="h-10 text-sm rounded-lg border-border"
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deliveryTime" className="text-[13px] font-medium text-foreground">Delivery Timeline</Label>
              <Input
                id="deliveryTime"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="15-21 Working Days"
                className="h-10 text-sm rounded-lg border-border"
                disabled={busy}
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
                className="h-8 text-xs font-semibold rounded-lg"
              >
                <Plus className="mr-1 size-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={req}
                    onChange={(e) => handleRequirementChange(idx, e.target.value)}
                    placeholder="e.g. National ID Card / Online Birth Certificate"
                    className="h-10 text-sm rounded-lg border-border"
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRequirement(idx)}
                    disabled={busy || requirements.length === 1}
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[13px] font-medium text-foreground">Overview Notes</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Important notes, jurisdiction guidelines, or inclusions..."
              className="text-sm rounded-lg border-border resize-none"
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Active Status</p>
              <p className="text-xs text-muted-foreground">
                Available for customer selection and quotation calculation
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={busy} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
              className="h-10 rounded-lg text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-10 rounded-lg text-sm font-semibold">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
