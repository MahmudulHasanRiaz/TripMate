"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { slugify, postCategoryInput } from "@/modules/content/validation";
import { savePostCategory } from "./actions";
import type { PostCategoryRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FieldKey = "name" | "slug";
type FieldErrors = Partial<Record<FieldKey, string>>;

/**
 * Create/edit dialog for a blog post category. Client validation runs the
 * authoritative `postCategoryInput` schema so slug shape errors inline; the
 * server re-parses on save and relays slug conflicts onto the slug field.
 */
export default function PostCategoryFormDialog({
  row,
  open,
  onCancel,
  onSaved,
}: {
  row: PostCategoryRow | null;
  open: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = row !== null;
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
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
      const parsed = postCategoryInput.safeParse({
        ...(row?.id ? { id: row.id } : {}),
        name,
        slug,
      });
      if (!parsed.success) {
        const next: FieldErrors = {};
        let root = "";
        for (const issue of parsed.error.issues) {
          const field = issue.path[0];
          if (field === "name" || field === "slug") {
            if (!next[field]) next[field] = issue.message;
          } else if (!root) {
            root = issue.message;
          }
        }
        setErrors(next);
        if (root) setRootError(root);
        return;
      }
      const res = await savePostCategory(parsed.data);
      if (!res.ok) {
        if (res.code === "SLUG_CONFLICT") {
          setErrors((prev) => ({ ...prev, slug: res.error ?? "A category with this slug already exists." }));
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
          <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Update “${row.name}” — posts keep their category.`
              : "Add a category the blog uses to group posts."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="post-category-name" className="text-[13px] font-medium text-foreground">Name</Label>
            <Input
              id="post-category-name"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="e.g. Travel Tips"
              className="h-10 text-sm rounded-lg border-border"
            />
            {errors.name ? (
              <p className="text-sm font-medium text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-category-slug" className="text-[13px] font-medium text-foreground">Slug</Label>
            <Input
              id="post-category-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="travel-tips"
              className="h-10 text-sm rounded-lg border-border"
            />
            {errors.slug ? (
              <p className="text-sm font-medium text-destructive">{errors.slug}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Lowercase, dash-separated; used in URLs.</p>
            )}
          </div>

          {rootError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {rootError}
            </p>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel} className="h-10 rounded-lg text-sm font-semibold">
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="h-10 rounded-lg text-sm font-semibold">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
