"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { slugify, destinationInput } from "@/modules/catalog/validation";
import { saveDestination } from "./actions";
import type { DestinationRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import MediaPickerField, {
  MediaPickerButton,
} from "@/components/admin/MediaPickerField";
import VideosEditor from "@/components/admin/VideosEditor";
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
  const [galleryRows, setGalleryRows] = useState<{ url: string; alt: string }[]>(
    (row?.gallery ?? []).map((g) => ({ url: g.url, alt: g.alt ?? "" })),
  );
  const [videoRows, setVideoRows] = useState<{ url: string; title: string }[]>(
    (row?.videos ?? []).map((v) => ({ url: v.url, title: v.title })),
  );
  const [description, setDescription] = useState(row?.description ?? "");
  const [sortOrder, setSortOrder] = useState<number>(row?.sortOrder ?? 0);
  const [isFeatured, setIsFeatured] = useState<boolean>(row?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [rootError, setRootError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateGalleryRow = (
    index: number,
    patch: Partial<{ url: string; alt: string }>,
  ) => {
    setGalleryRows((rows) =>
      rows.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

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
        gallery: galleryRows
          .map((entry) => ({ url: entry.url.trim(), alt: entry.alt.trim() }))
          .filter((entry) => entry.url.length > 0),
        videos: videoRows
          .map((entry) => ({ url: entry.url.trim(), title: entry.title.trim() }))
          .filter((entry) => entry.url.length > 0),
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
            // gallery / videos have no field slot — the first such message
            // surfaces as the root error instead.
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{editing ? "Edit destination" : "New destination"}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editing ? `Update “${row.name}” — the save is a full replace.` : "Add a travel destination to the public catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="destination-name" className="text-[13px] font-medium text-foreground">Name</Label>
            <Input
              id="destination-name"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="e.g. Cox's Bazar"
              className="h-10 text-sm rounded-lg border-border"
            />
            {errors.name ? (
              <p className="text-xs font-medium text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="destination-slug" className="text-[13px] font-medium text-foreground">Slug</Label>
            <Input
              id="destination-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="coxs-bazar"
              className="h-10 text-sm rounded-lg border-border font-mono"
            />
            {errors.slug ? (
              <p className="text-xs font-medium text-destructive">{errors.slug}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Lowercase, dash-separated; used in URLs.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <MediaPickerField
              label="Destination Image"
              value={image}
              onChange={setImage}
              placeholder="/media/..."
            />
            {errors.image ? (
              <p className="text-xs font-medium text-destructive">{errors.image}</p>
            ) : null}
          </div>

          {/* Gallery rows — same row-editor pattern as the ListingForm. */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Gallery</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGalleryRows([...galleryRows, { url: "", alt: "" }])}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add image
              </Button>
            </div>
            <ul className="space-y-3">
              {galleryRows.map((entry, index) => (
                <li key={index} className="rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div className="flex items-start gap-1 sm:col-span-2">
                        <Input
                          className="flex-1"
                          placeholder="https://…/image.jpg"
                          aria-label={`Gallery image ${index + 1} URL`}
                          value={entry.url}
                          onChange={(e) => updateGalleryRow(index, { url: e.target.value })}
                        />
                        <MediaPickerButton
                          accept="image"
                          label={`Browse media for gallery image ${index + 1}`}
                          onPick={(url) => updateGalleryRow(index, { url })}
                        />
                      </div>
                      <Input
                        placeholder="Alt text"
                        aria-label={`Gallery image ${index + 1} alt text`}
                        value={entry.alt}
                        onChange={(e) => updateGalleryRow(index, { alt: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setGalleryRows(galleryRows.filter((_, i) => i !== index))}
                      aria-label={`Remove gallery image ${index + 1}`}
                      className="mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {galleryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gallery images yet.</p>
            ) : null}
          </div>

          <VideosEditor value={videoRows} onChange={setVideoRows} />

          <div className="space-y-1.5">
            <Label htmlFor="destination-desc" className="text-[13px] font-medium text-foreground">Editorial Description</Label>
            <Textarea
              id="destination-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of this travel destination, attractions, and cultural highlights..."
              rows={3}
              className="text-sm rounded-lg border-border resize-none"
            />
            {errors.description ? (
              <p className="text-xs font-medium text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="destination-order" className="text-[13px] font-medium text-foreground">Sort Order</Label>
              <Input
                id="destination-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                min={0}
                className="h-10 text-sm rounded-lg border-border font-mono tabular-nums"
              />
              {errors.sortOrder ? (
                <p className="text-xs font-medium text-destructive">{errors.sortOrder}</p>
              ) : null}
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3 shadow-xs">
                <div>
                  <p className="text-sm font-medium leading-none text-foreground">Featured</p>
                  <p className="mt-1 text-xs text-muted-foreground">Homepage highlight</p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} aria-label="Featured destination" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3 shadow-xs">
            <div>
              <p className="text-sm font-medium leading-none text-foreground">Active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inactive destinations can&apos;t accept new listings.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Destination active" />
          </div>

          {rootError ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {rootError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="h-10 px-4 rounded-lg text-sm font-medium">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : "Create destination"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
