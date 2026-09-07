"use client";

/**
 * Create + edit form for a blog post.
 *
 * ROUTE PATTERN: create renders at /admin/content/posts/new (no id); edit
 * renders at /admin/content/posts/[id]/edit. Both mount this same client form
 * with a server-built `initial` snapshot.
 *
 * Validation is two-layer (mirrors the catalog ListingForm):
 *  1. A light client schema (react-hook-form + zodResolver) gives instant
 *     inline feedback for required fields and the slug shape.
 *  2. On submit the raw text values are mapped to a `PostInput` payload and
 *     run through the authoritative Task-7 schema; per-field issues are mapped
 *     back onto the matching form fields, and the server action re-parses the
 *     payload as the final trust boundary.
 *
 * AUTHOR IS NOT A FIELD: it is stamped server-side from the session on create
 * (see ./actions.ts) so an editor can never attribute a post to someone else.
 *
 * Media note: the featured image + gallery rows are MediaPickerFields (URL
 * input + media-library browse dialog, Plan 7 T2); manual URL typing still
 * works. Gallery alt text is typed by hand here.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, RefreshCw, X } from "lucide-react";

import {
  CONTENT_STATUSES,
  MAX_MARKDOWN_CHARS,
  slugify,
  slugSchema,
  postInput,
} from "@/modules/content/validation";
import type { ContentStatus } from "@/modules/content/validation";
import { savePost } from "./actions";
import MediaPickerField, {
  MediaPickerButton,
} from "@/components/admin/MediaPickerField";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export type PostCategoryOption = { id: string; name: string };

export type PostFormInitial = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageUrl: string;
  gallery: { url: string; alt: string }[];
  categoryId: string; // "" = no category (categoryId is nullable)
  status: ContentStatus;
  seoTitle: string;
  seoDescription: string;
};

type PostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageUrl: string;
  gallery: { url: string; alt: string }[];
  categoryId: string;
  status: ContentStatus;
  seoTitle: string;
  seoDescription: string;
};

const NONE = "__none__";

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  slug: slugSchema,
  excerpt: z.string().max(500, "Excerpt must be 500 characters or fewer"),
  content: z
    .string()
    .max(MAX_MARKDOWN_CHARS, `Content exceeds ${MAX_MARKDOWN_CHARS.toLocaleString()} characters`),
  featuredImageUrl: z.string().max(2048),
  gallery: z
    .array(z.object({ url: z.string().max(2048), alt: z.string().max(200) }))
    .max(60, "Gallery is limited to 60 images"),
  categoryId: z.string(),
  status: z.enum(CONTENT_STATUSES),
  seoTitle: z.string().max(70, "SEO title must be 70 characters or fewer"),
  seoDescription: z.string().max(160, "SEO description must be 160 characters or fewer"),
});

/* ------------------------------------------------------------------ */
/* Payload mapping                                                     */
/* ------------------------------------------------------------------ */

function toPostPayload(values: PostFormValues, id?: string): Record<string, unknown> {
  const gallery = values.gallery
    .map((g) => ({ url: g.url.trim(), alt: g.alt.trim() }))
    .filter((g) => g.url.length > 0);
  const featuredImageUrl = values.featuredImageUrl.trim();

  return {
    ...(id ? { id } : {}),
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt.trim() || null,
    content: values.content || null,
    featuredImage: featuredImageUrl ? { url: featuredImageUrl } : null,
    gallery, // empty array → validation's blank→null preprocess clears the column
    categoryId: values.categoryId === "" ? null : values.categoryId,
    status: values.status,
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
/* Main form                                                           */
/* ------------------------------------------------------------------ */

export default function PostForm({
  initial,
  categories,
}: {
  initial: PostFormInitial;
  categories: PostCategoryOption[];
}) {
  const router = useRouter();
  const form = useForm<PostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial,
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

  // Slug from the just-typed value (see ListingForm for why this reads the raw
  // value instead of the useWatch-backed `title`).
  const slugFrom = (raw: string) => {
    if (slugEdited.current) return;
    const generated = slugify(raw);
    if (generated) form.setValue("slug", generated, { shouldDirty: true });
  };

  const galleryFields = useFieldArray({ control: form.control, name: "gallery" });

  const editing = Boolean(initial.id);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      const payload = toPostPayload(values, initial.id);
      const parsed = postInput.safeParse(payload);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        for (const issue of issues) {
          const [first, second] = issue.path;
          const isScalar = issue.path.length === 1 && typeof first === "string";
          if (isScalar && first in values) {
            form.setError(first as keyof PostFormValues, {
              type: "manual",
              message: issue.message,
            });
          } else if (first === "gallery" && typeof first === "string") {
            form.setError(first, {
              type: "manual",
              message: `Row ${Number(second) + 1}: ${issue.message}`,
            });
          }
        }
        const firstIssue = issues[0];
        const path = firstIssue.path.join(".");
        setSubmitError(`${path ? `${path}: ` : ""}${firstIssue.message}`);
        return;
      }

      const res = await savePost(parsed.data);
      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          form.setError("slug", { type: "manual", message: res.error ?? "Slug already in use." });
        }
        setSubmitError(res.error ?? "Something went wrong on the server.");
        return;
      }
      router.push("/admin/content/posts" as Route);
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
        <section aria-labelledby="post-basics-heading" className="space-y-5">
          <h3 id="post-basics-heading" className="text-base font-semibold tracking-tight">
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
                      placeholder="e.g. Five Sights You Cannot Miss in Dhaka"
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
                        placeholder="five-sights-in-dhaka"
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
                  <FormDescription>
                    Used in the public URL. Lowercase, dash-separated.
                  </FormDescription>
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
                      {CONTENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Draft stays hidden; published appears on the public site.
                  </FormDescription>
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
                  {/* Constant "" default keeps the select fully controlled. */}
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        {/* --- Content --- */}
        <section aria-labelledby="post-content-heading" className="space-y-5">
          <h3 id="post-content-heading" className="text-base font-semibold tracking-tight">
            Content
          </h3>
          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excerpt</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="One or two lines shown in post cards and search"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    rows={12}
                    placeholder="Markdown supported — ## headings, **bold**, lists…"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Rendered as markdown on the public page.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Media: featured image + gallery pick from the library (or paste a URL). */}
          <FormField
            control={form.control}
            name="featuredImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <MediaPickerField
                    label="Featured image"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryFields.append({ url: "", alt: "" })}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add image
              </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => galleryFields.remove(index)}
                      aria-label={`Remove gallery image ${index + 1}`}
                      className="mt-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {galleryFields.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gallery images yet.</p>
            ) : null}
          </div>
        </section>

        <Separator />

        {/* --- SEO --- */}
        <section aria-labelledby="post-seo-heading" className="space-y-5">
          <h3 id="post-seo-heading" className="text-base font-semibold tracking-tight">
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
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => router.push("/admin/content/posts" as Route)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {editing ? "Save changes" : "Create post"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
