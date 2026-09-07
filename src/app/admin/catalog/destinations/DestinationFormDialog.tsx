"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { slugify, destinationInput } from "@/modules/catalog/validation";
import { saveDestination } from "./actions";
import type { DestinationRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import MediaPickerField from "@/components/admin/MediaPickerField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FieldKey = "name" | "slug" | "image" | "description" | "sortOrder";
type FieldErrors = Partial<Record<FieldKey, string>>;

/**
 * Create/edit dialog for a destination. Full-replace upsert — the isActive
 * toggle is always sent (T4-review carry-in so an edit can never silently
 * reactivate a deactivated destination). Image is a URL text field until the
 * T6 media library lands.
 */
export default function DestinationFormDialog({
  row,
  open,
  onCancel,
  onSaved,
}: {
  row: DestinationRow | null;
  open: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = row !== null;
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [image, setImage] = useState(row?.image ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [sortOrder, setSortOrder] = useState<number>(row?.sortOrder ?? 0);
  const [isFeatured, setIsFeatured] = useState<boolean>(row?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [rootError, setRootError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleName = (value: string) => {
    setName(value);
    if (!slugTouched) {
      const generated = slugify(value);
      if (generated) setSlug(generated);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setRootError(null);
    try {
      const payload = {
        ...(row?.id ? { id: row.id } : {}),
        name,
        slug,
        image: image.trim() || null,
        description: description.trim() || null,
        sortOrder,
        isFeatured,
        isActive,
      };
      const parsed = destinationInput.safeParse(payload);
      if (!parsed.success) {
        const next: FieldErrors = {};
        let root = "";
        for (const issue of parsed.error.issues) {
          const field = issue.path[0];
          if (field === "name" || field === "slug" || field === "image" || field === "description" || field === "sortOrder") {
            if (!next[field]) next[field] = issue.message;
          } else if (!root) {
            root = issue.message;
          }
        }
        setErrors(next);
        if (root) setRootError(root);
        return;
      }
      const res = await saveDestination(parsed.data);
      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          setErrors((prev) => ({ ...prev, slug: res.error ?? "A destination with this slug already exists." }));
        } else {
          setRootError(res.error ?? "Something went wrong on the server.");
        }
        return;
      }
      onSaved();
    } catch {
      setRootError("Something went wrong on the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit destination" : "New destination"}</DialogTitle>
          <DialogDescription>
            {editing ? `Update “${row.name}” — the save is a full replace.` : "Add a travel destination to the public catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination-name">Name</Label>
            <Input
              id="destination-name"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="e.g. Cox&apos;s Bazar"
            />
            {errors.name ? (
              <p className="text-sm font-medium text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination-slug">Slug</Label>
            <Input
              id="destination-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="coxs-bazar"
            />
            {errors.slug ? (
              <p className="text-sm font-medium text-destructive">{errors.slug}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Lowercase, dash-separated; used in URLs.</p>
            )}
          </div>

          <div className="space-y-2">
            <MediaPickerField
              label="Destination Image"
              value={image}
              onChange={setImage}
              placeholder="/media/..."
            />
            {errors.image ? (
              <p className="text-sm font-medium text-destructive">{errors.image}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination-desc">Editorial Description</Label>
            <Textarea
              id="destination-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of this travel destination, attractions, and cultural highlights..."
              rows={3}
              className="resize-none"
            />
            {errors.description ? (
              <p className="text-sm font-medium text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="destination-order">Sort Order</Label>
              <Input
                id="destination-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                min={0}
              />
              {errors.sortOrder ? (
                <p className="text-sm font-medium text-destructive">{errors.sortOrder}</p>
              ) : null}
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium leading-none">Featured</p>
                  <p className="mt-1 text-xs text-muted-foreground">Homepage highlight</p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} aria-label="Featured destination" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium leading-none">Active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inactive destinations can&apos;t accept new listings.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Destination active" />
          </div>

          {rootError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {rootError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : "Create destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
