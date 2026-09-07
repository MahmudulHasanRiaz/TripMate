"use client";

/**
 * Create + edit form for a catalog listing.
 *
 * ROUTE PATTERN: create renders at /admin/catalog/listings/new (no id); edit
 * renders at /admin/catalog/listings/[id]/edit. Both mount this same client
 * form with a server-built `initial` snapshot — query-string state is not used
 * for the form because the id lives in the URL path (deep-linkable, and there
 * is no transient draft to lose).
 *
 * Validation is two-layer:
 *  1. A light client schema (react-hook-form + zodResolver) gives instant
 *     inline feedback for required fields and the slug shape.
 *  2. On submit the raw text values are mapped to a `ListingInput` payload and
 *     run through the authoritative Task-4 schema; per-field issues are mapped
 *     back onto the matching form fields, and the server action re-parses the
 *     payload as the final trust boundary.
 *
 * Media note: image fields are MediaPickerFields (URL input + media-library
 * browse dialog, Plan 7 T2) — manual URL typing still works; alt text for
 * gallery images is typed by hand here.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, RefreshCw, X } from "lucide-react";

import {
  LISTING_STATUSES,
  slugify,
  slugSchema,
  listingInput,
} from "@/modules/catalog/validation";
import type { ListingStatus } from "@/modules/catalog/validation";
import { saveListing } from "./actions";
import MediaPickerField, {
  MediaPickerButton,
} from "@/components/admin/MediaPickerField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CategoryOption = { id: string; name: string; kind: string; isActive: boolean };
export type DestinationOption = { id: string; name: string; isActive: boolean };

export type ListingFormInitial = {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  destinationId: string;
  summary: string;
  description: string;
  coverImage: string;
  videoUrl: string;
  durationDays: string;
  rating: string;
  price: string;
  currency: string;
  status: ListingStatus;
  gallery: { url: string; alt: string }[];
  itinerary: { day: string; title: string; details: string }[];
  inclusions: string[];
  exclusions: string[];
  seoTitle: string;
  seoDescription: string;
};

type ListingFormValues = {
  title: string;
  slug: string;
  categoryId: string;
  destinationId: string;
  status: ListingStatus;
  currency: string;
  price: string;
  durationDays: string;
  rating: string;
  summary: string;
  description: string;
  coverImage: string;
  videoUrl: string;
  gallery: { url: string; alt: string }[];
  itinerary: { day: string; title: string; details: string }[];
  inclusions: { value: string }[];
  exclusions: { value: string }[];
  seoTitle: string;
  seoDescription: string;
};

const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "SAR", "MYR", "SGD"];
const NONE = "__none__";

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  slug: slugSchema,
  categoryId: z.string().min(1, "Category is required"),
  destinationId: z.string(),
  status: z.enum(LISTING_STATUSES),
  currency: z.string().min(1, "Currency is required").max(10),
  price: z.string().max(32),
  durationDays: z.string().max(9),
  rating: z.string().max(8),
  summary: z.string().max(300, "Summary must be 300 characters or fewer"),
  description: z.string(),
  coverImage: z.string().max(2048),
  videoUrl: z.string().max(2048),
  gallery: z.array(z.object({ url: z.string().max(2048), alt: z.string().max(200) })),
  itinerary: z.array(
    z.object({
      day: z.string().max(50),
      title: z.string().max(200),
      details: z.string().max(4000),
    }),
  ),
  inclusions: z.array(z.object({ value: z.string() })),
  exclusions: z.array(z.object({ value: z.string() })),
  seoTitle: z.string().max(70, "SEO title must be 70 characters or fewer"),
  seoDescription: z.string().max(160, "SEO description must be 160 characters or fewer"),
});

function toFormValues(initial: ListingFormInitial): ListingFormValues {
  return {
    ...initial,
    inclusions: initial.inclusions.map((value) => ({ value })),
    exclusions: initial.exclusions.map((value) => ({ value })),
  };
}

/* ------------------------------------------------------------------ */
/* Payload mapping                                                     */
/* ------------------------------------------------------------------ */

function numOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

function toListingPayload(values: ListingFormValues, id?: string): Record<string, unknown> {
  const gallery = values.gallery
    .map((g) => ({ url: g.url.trim(), alt: g.alt.trim() }))
    .filter((g) => g.url.length > 0);
  const itinerary = values.itinerary
    .map((row) => ({
      day: row.day.trim(),
      title: row.title.trim(),
      details: row.details.trim(),
    }))
    .filter((row) => row.day.length > 0 && row.title.length > 0);
  const strings = (rows: { value: string }[]) =>
    rows.map((r) => r.value.trim()).filter((v) => v.length > 0);

  return {
    ...(id ? { id } : {}),
    title: values.title,
    slug: values.slug,
    categoryId: values.categoryId,
    destinationId: values.destinationId === NONE ? null : values.destinationId,
    status: values.status,
    currency: values.currency,
    price: numOrNull(values.price),
    durationDays: numOrNull(values.durationDays),
    rating: numOrNull(values.rating),
    summary: values.summary.trim() || null,
    description: values.description || null,
    coverImage: values.coverImage.trim() || null,
    videoUrl: values.videoUrl.trim() || null,
    gallery,
    itinerary,
    inclusions: strings(values.inclusions),
    exclusions: strings(values.exclusions),
    seo:
      values.seoTitle.trim() || values.seoDescription.trim()
        ? {
            title: values.seoTitle.trim() || undefined,
            description: values.seoDescription.trim() || undefined,
          }
        : null,
  };
}

/* ------------------------------------------------------------------ */
/* Sub-editors                                                         */
/* ------------------------------------------------------------------ */

function AddRowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      className="mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function StringListEditor({
  value,
  onChange,
  addLabel,
  removeLabel,
  placeholder,
}: {
  value: { value: string }[];
  onChange: (rows: { value: string }[]) => void;
  addLabel: string;
  removeLabel: string;
  placeholder: string;
}) {
  const update = (index: number, text: string) => {
    const next = value.map((row, i) => (i === index ? { value: text } : row));
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {value.map((row, index) => (
          <li key={index} className="flex items-start gap-2">
            <Input
              value={row.value}
              onChange={(e) => update(index, e.target.value)}
              placeholder={placeholder}
              className="h-9"
              aria-label={`${removeLabel} ${index + 1}`}
            />
            <RemoveRowButton onClick={() => onChange(value.filter((_, i) => i !== index))} label={`Remove ${removeLabel} ${index + 1}`} />
          </li>
        ))}
      </ul>
      <AddRowButton onClick={() => onChange([...value, { value: "" }])} label={addLabel} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                           */
/* ------------------------------------------------------------------ */

export default function ListingForm({
  initial,
  categories,
  destinations,
}: {
  initial: ListingFormInitial;
  categories: CategoryOption[];
  destinations: DestinationOption[];
}) {
  const router = useRouter();
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(initial),
  });

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const slugEdited = useRef(Boolean(initial.slug));

  const title = useWatch({ control: form.control, name: "title" });

  const autoSlug = () => {
    if (slugEdited.current) return;
    const generated = slugify(title);
    if (generated) form.setValue("slug", generated, { shouldDirty: true });
  };

  // Slug from the just-typed value. useWatch only reflects state after the
  // render following this event, so reading `title` here would see the stale
  // (empty) value on a single full-value fill and leave the slug unset.
  const slugFrom = (raw: string) => {
    if (slugEdited.current) return;
    const generated = slugify(raw);
    if (generated) form.setValue("slug", generated, { shouldDirty: true });
  };

  // Repeatable arrays.
  const galleryFields = useFieldArray({ control: form.control, name: "gallery" });
  const itineraryFields = useFieldArray({ control: form.control, name: "itinerary" });

  const editing = Boolean(initial.id);
  const activeCategories = categories.filter((c) => c.isActive).length;

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      const payload = toListingPayload(values, initial.id);
      const parsed = listingInput.safeParse(payload);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        // Map scalar field issues back onto the matching form fields; nested
        // repeatable issues surface in the top error.
        for (const issue of issues) {
          const [first, second] = issue.path;
          const isScalar = issue.path.length === 1 && typeof first === "string";
          if (isScalar && first in values) {
            form.setError(first as keyof ListingFormValues, {
              type: "manual",
              message: issue.message,
            });
          } else if (first === "gallery" || first === "itinerary") {
            // Attach to the parent field name so the error is discoverable.
            if (typeof first === "string") {
              form.setError(first as keyof ListingFormValues, {
                type: "manual",
                message: `Row ${Number(second) + 1}: ${issue.message}`,
              });
            }
          }
        }
        const firstIssue = issues[0];
        const path = firstIssue.path.join(".");
        setSubmitError(`${path ? `${path}: ` : ""}${firstIssue.message}`);
        return;
      }

      const res = await saveListing(parsed.data);
      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          form.setError("slug", { type: "manual", message: res.error ?? "Slug already in use." });
        }
        setSubmitError(res.error ?? "Something went wrong on the server.");
        return;
      }
      router.push("/admin/catalog/listings" as Route);
    } catch {
      setSubmitError("Something went wrong on the server.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="mx-auto max-w-4xl space-y-8">
        {submitError ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            {submitError}
          </p>
        ) : null}

        {/* --- Basics --- */}
        <section aria-labelledby="basics-heading" className="space-y-5">
          <h3 id="basics-heading" className="text-base font-semibold tracking-tight">
            Basics
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Cox&apos;s Beach Escape"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!editing) slugFrom(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="coxs-beach-escape"
                        {...field}
                        onChange={(e) => {
                          slugEdited.current = true;
                          field.onChange(e);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Regenerate slug from title"
                        title="Regenerate from title"
                        onClick={() => {
                          slugEdited.current = false;
                          autoSlug();
                        }}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>Used in the public URL. Lowercase, dash-separated.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  {/* Constant string (default "" = unset) keeps the select fully
                      controlled — `undefined` would start it uncontrolled and flip
                      it on first pick (console warning). */}
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={activeCategories === 0 ? "No active categories — add one first" : "Select a category"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {!c.isActive ? " (inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only active categories accept a save.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destinationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <Select value={field.value || NONE} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>No destination</SelectItem>
                      {destinations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                          {!d.isActive ? " (inactive)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LISTING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Draft stays hidden; published appears on the public site.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-5 sm:col-span-2 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (0–5)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="4.8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* --- Content --- */}
        <section aria-labelledby="content-heading" className="space-y-5">
          <h3 id="content-heading" className="text-base font-semibold tracking-tight">
            Content
          </h3>
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Input placeholder="One or two lines shown in listing cards" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={8}
                    placeholder="Markdown supported — ## headings, **bold**, lists…"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Rendered as markdown on the public page.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Media: cover + gallery pick from the library (or paste a URL). */}
          <FormField
            control={form.control}
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <MediaPickerField
                    label="Cover image"
                    value={field.value}
                    onChange={field.onChange}
                    accept="image"
                  />
                </FormControl>
                <FormDescription>
                  Pick from the media library or paste any image URL.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Gallery</Label>
              <AddRowButton onClick={() => galleryFields.append({ url: "", alt: "" })} label="Add image" />
            </div>
            <ul className="space-y-3">
              {galleryFields.fields.map((field, index) => (
                <li key={field.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <div className="flex items-start gap-1 sm:col-span-2">
                        <Input
                          className="flex-1"
                          placeholder="https://…/image.jpg"
                          aria-label={`Gallery image ${index + 1} URL`}
                          {...form.register(`gallery.${index}.url`)}
                        />
                        <MediaPickerButton
                          label={`Browse media for gallery image ${index + 1}`}
                          onPick={(url) =>
                            form.setValue(`gallery.${index}.url`, url, {
                              shouldDirty: true,
                            })
                          }
                        />
                      </div>
                      <Input
                        placeholder="Alt text"
                        aria-label={`Gallery image ${index + 1} alt text`}
                        {...form.register(`gallery.${index}.alt`)}
                      />
                    </div>
                    <RemoveRowButton
                      onClick={() => galleryFields.remove(index)}
                      label={`Remove gallery image ${index + 1}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {galleryFields.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gallery images yet.</p>
            ) : null}
          </div>
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.youtube.com/watch?v=…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />

        {/* --- Itinerary --- */}
        <section aria-labelledby="itinerary-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="itinerary-heading" className="text-base font-semibold tracking-tight">
                Itinerary
              </h3>
              <p className="text-sm text-muted-foreground">
                Day-by-day plan. Blank rows are ignored.
              </p>
            </div>
            <AddRowButton onClick={() => itineraryFields.append({ day: "", title: "", details: "" })} label="Add day" />
          </div>
          <ul className="space-y-3">
            {itineraryFields.fields.map((field, index) => (
              <li key={field.id} className="rounded-md border border-border p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[8rem_1fr]">
                    <Input
                      placeholder="Day (e.g. 1 or 1-3)"
                      aria-label={`Itinerary entry ${index + 1} day`}
                      {...form.register(`itinerary.${index}.day`)}
                    />
                    <Input
                      placeholder="Title"
                      aria-label={`Itinerary entry ${index + 1} title`}
                      {...form.register(`itinerary.${index}.title`)}
                    />
                    <Textarea
                      className="sm:col-span-2"
                      rows={2}
                      placeholder="Details (markdown ok)"
                      aria-label={`Itinerary entry ${index + 1} details`}
                      {...form.register(`itinerary.${index}.details`)}
                    />
                  </div>
                  <RemoveRowButton
                    onClick={() => itineraryFields.remove(index)}
                    label={`Remove itinerary entry ${index + 1}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Inclusions / exclusions --- */}
        <section aria-labelledby="lists-heading" className="space-y-5">
          <h3 id="lists-heading" className="text-base font-semibold tracking-tight">
            What&apos;s included
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="inclusions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inclusions</FormLabel>
                  <FormControl>
                    <StringListEditor
                      value={field.value}
                      onChange={field.onChange}
                      addLabel="Add inclusion"
                      removeLabel="inclusion"
                      placeholder="e.g. 5-star hotel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exclusions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclusions</FormLabel>
                  <FormControl>
                    <StringListEditor
                      value={field.value}
                      onChange={field.onChange}
                      addLabel="Add exclusion"
                      removeLabel="exclusion"
                      placeholder="e.g. Flights"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        {/* --- SEO --- */}
        <section aria-labelledby="seo-heading" className="space-y-5">
          <h3 id="seo-heading" className="text-base font-semibold tracking-tight">
            Search engine listing
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO title</FormLabel>
                  <FormControl>
                    <Input placeholder={`${initial.title || "Title"} — TripMate`} {...field} />
                  </FormControl>
                  <FormDescription>
                    <span className={cn(field.value.length > 60 && "font-medium text-warning")}>
                      {field.value.length}/70
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Shown under the title in search results"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    <span className={cn(field.value.length > 140 && "font-medium text-warning")}>
                      {field.value.length}/160
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <div className="flex flex-wrap items-center justify-end gap-3 pb-6">
          {categories.length === 0 ? (
            <Badge variant="warning">Create a category before saving a listing.</Badge>
          ) : null}
          <Button type="button" variant="outline" disabled={saving} onClick={() => router.push("/admin/catalog/listings")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {editing ? "Save changes" : "Create listing"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
