"use client";

/**
 * Create + edit form for a static page (about-us, faq, terms, …).
 *
 * ROUTE PATTERN: create at /admin/content/pages/new, edit at
 * /admin/content/pages/[id]/edit; both mount this client form with a
 * server-built `initial` snapshot.
 *
 * SECTIONS MODEL v1 is markdown-only: the page is an ordered list of markdown
 * blocks, each edited in its own textarea with add/remove/move up-down controls.
 * Unknown section types are refused by the authoritative schema (Plan 4 grows
 * the union with LP blocks — hero cards, CTAs, … and this editor grows matching
 * block editors). Blank textareas are dropped before submit; an empty result is
 * rejected ("at least one section").
 *
 * Validation is two-layer, same as PostForm/ListingForm: a light client schema
 * for instant inline feedback, then the authoritative Task-7 `pageInput` schema
 * on submit, with the server action re-parsing as the final trust boundary.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, X } from "lucide-react";

import {
  CONTENT_STATUSES,
  MAX_MARKDOWN_CHARS,
  slugify,
  slugSchema,
  pageInput,
} from "@/modules/content/validation";
import type { ContentStatus } from "@/modules/content/validation";
import { savePage } from "./actions";

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

export type PageFormInitial = {
  id?: string;
  title: string;
  slug: string;
  status: ContentStatus;
  sections: { content: string }[];
  seoTitle: string;
  seoDescription: string;
};

type PageFormValues = {
  title: string;
  slug: string;
  status: ContentStatus;
  sections: { content: string }[];
  seoTitle: string;
  seoDescription: string;
};

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  slug: slugSchema,
  status: z.enum(CONTENT_STATUSES),
  sections: z.array(
    z.object({
      content: z
        .string()
        .max(
          MAX_MARKDOWN_CHARS,
          `Content exceeds ${MAX_MARKDOWN_CHARS.toLocaleString()} characters`,
        ),
    }),
  ),
  seoTitle: z.string().max(70, "SEO title must be 70 characters or fewer"),
  seoDescription: z.string().max(160, "SEO description must be 160 characters or fewer"),
});

/* ------------------------------------------------------------------ */
/* Payload mapping                                                     */
/* ------------------------------------------------------------------ */

function toPagePayload(values: PageFormValues, id?: string): Record<string, unknown> {
  // Blank sections are dropped; the schema requires at least one survives.
  const sections = values.sections
    .map((s) => ({ type: "markdown" as const, content: s.content.trim() }))
    .filter((s) => s.content.length > 0);

  return {
    ...(id ? { id } : {}),
    title: values.title,
    slug: values.slug,
    status: values.status,
    sections,
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

export default function PageForm({ initial }: { initial: PageFormInitial }) {
  const router = useRouter();
  const form = useForm<PageFormValues>({
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

  const slugFrom = (raw: string) => {
    if (slugEdited.current) return;
    const generated = slugify(raw);
    if (generated) form.setValue("slug", generated, { shouldDirty: true });
  };

  const sectionFields = useFieldArray({ control: form.control, name: "sections" });

  const editing = Boolean(initial.id);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setSubmitError(null);
    try {
      const payload = toPagePayload(values, initial.id);
      const parsed = pageInput.safeParse(payload);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        for (const issue of issues) {
          // Only scalar fields map cleanly onto FormFields; section-level issues
          // (e.g. "at least one section") surface in the banner below.
          if (issue.path.length === 1 && issue.path[0] === "title") {
            form.setError("title", { type: "manual", message: issue.message });
          } else if (issue.path.length === 1 && issue.path[0] === "slug") {
            form.setError("slug", { type: "manual", message: issue.message });
          }
        }
        const firstIssue = issues[0];
        const path = firstIssue.path.join(".");
        setSubmitError(`${path ? `${path}: ` : ""}${firstIssue.message}`);
        return;
      }

      const res = await savePage(parsed.data);
      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          form.setError("slug", { type: "manual", message: res.error ?? "Slug already in use." });
        }
        setSubmitError(res.error ?? "Something went wrong on the server.");
        return;
      }
      router.push("/admin/content/pages" as Route);
    } catch {
      setSubmitError("Something went wrong on the server.");
    } finally {
      setSaving(false);
    }
  });

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sectionFields.fields.length) return;
    sectionFields.move(index, target);
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="mx-auto max-w-4xl space-y-8">
        {submitError ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
            {submitError}
          </p>
        ) : null}

        {/* --- Basics --- */}
        <section aria-labelledby="page-basics-heading" className="space-y-5">
          <h3 id="page-basics-heading" className="text-base font-semibold tracking-tight">
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
                      placeholder="e.g. About Us"
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
                        placeholder="about-us"
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
                <FormItem className="sm:col-span-2">
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
                    Draft pages stay hidden; published pages appear on the public site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        {/* --- Sections --- */}
        <section aria-labelledby="page-sections-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="page-sections-heading" className="text-base font-semibold tracking-tight">
                Sections
              </h3>
              <p className="text-sm text-muted-foreground">
                Ordered markdown blocks. Use the arrows to reorder.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sectionFields.append({ content: "" })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add section
            </Button>
          </div>

          <ul className="space-y-4">
            {sectionFields.fields.map((field, index) => (
              <li key={field.id} className="rounded-md border border-border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label htmlFor={`page-section-${index}-content`} className="text-sm font-semibold">
                    Section {index + 1}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={`Move section ${index + 1} up`}
                      onClick={() => moveSection(index, -1)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === sectionFields.fields.length - 1}
                      aria-label={`Move section ${index + 1} down`}
                      onClick={() => moveSection(index, 1)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove section ${index + 1}`}
                      onClick={() => sectionFields.remove(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  id={`page-section-${index}-content`}
                  rows={6}
                  placeholder="Markdown — ## heading, **bold**, lists, links…"
                  {...form.register(`sections.${index}.content`)}
                />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Blank sections are ignored when saving. A page needs at least one.
          </p>
        </section>

        <Separator />

        {/* --- SEO --- */}
        <section aria-labelledby="page-seo-heading" className="space-y-5">
          <h3 id="page-seo-heading" className="text-base font-semibold tracking-tight">
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
            onClick={() => router.push("/admin/content/pages" as Route)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {editing ? "Save changes" : "Create page"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
