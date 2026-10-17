"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  SERVICE_KINDS,
  slugify,
  categoryInput,
} from "@/modules/catalog/validation";
import type { ServiceKind } from "@/modules/catalog/validation";
import { saveCategory } from "./actions";
import { CATEGORY_KIND_META } from "./kind-labels";
import type { CategoryRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FieldKey = "name" | "slug" | "redirectUrl" | "icon" | "sortOrder";
type FieldErrors = Partial<Record<FieldKey, string>>;

function makePayload(row: CategoryRow | null, state: {
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
}): Record<string, unknown> {
  return {
    ...(row?.id ? { id: row.id } : {}),
    name: state.name,
    slug: state.slug,
    kind: state.kind,
    redirectUrl: state.kind === "redirect" ? state.redirectUrl.trim() : null,
    icon: state.icon.trim() || null,
    sortOrder: state.sortOrder,
    isActive: state.isActive,
  };
}

/**
 * Create/edit dialog for a service category.
 *
 * The form is a FULL REPLACE upsert — every field (including the isActive
 * toggle) is sent back. That toggle is the T4-review carry-in: an editor who
 * leaves it off must not silently reactivate a deactivated category. Client
 * validation runs the authoritative `categoryInput` schema so slug shape and
 * the redirect-requires-URL rule error inline; the server re-parses on save.
 */
export default function CategoryFormDialog({
  row,
  open,
  onCancel,
  onSaved,
}: {
  row: CategoryRow | null;
  open: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = row !== null;
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [kind, setKind] = useState<ServiceKind>(row?.kind ?? "package");
  const [redirectUrl, setRedirectUrl] = useState(row?.redirectUrl ?? "");
  const [icon, setIcon] = useState(row?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(editing ? String(row.sortOrder) : "0");
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
      const parsed = categoryInput.safeParse(
        makePayload(row, { name, slug, kind, redirectUrl, icon, sortOrder, isActive }),
      );
      if (!parsed.success) {
        const next: FieldErrors = {};
        let root = "";
        for (const issue of parsed.error.issues) {
          const field = issue.path[0];
          if (field === "name" || field === "slug" || field === "redirectUrl" || field === "icon" || field === "sortOrder") {
            if (!next[field]) next[field] = issue.message;
          } else if (!root) {
            root = issue.message;
          }
        }
        setErrors(next);
        if (root) setRootError(root);
        return;
      }
      const res = await saveCategory(parsed.data);
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

  const kindHint = CATEGORY_KIND_META[kind].hint;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{editing ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editing ? `Update “${row.name}” — the save is a full replace.` : "Add a service category to the public catalog."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="category-name" className="text-[13px] font-medium text-foreground">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="e.g. Beach Tours"
              className="h-10 text-sm rounded-lg border-border"
            />
            {errors.name ? (
              <p className="text-xs font-medium text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category-slug" className="text-[13px] font-medium text-foreground">Slug</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="beach-tours"
              className="h-10 text-sm rounded-lg border-border font-mono"
            />
            {errors.slug ? (
              <p className="text-xs font-medium text-destructive">{errors.slug}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Lowercase, dash-separated; used in URLs.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground">Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ServiceKind)}>
              <SelectTrigger className="w-full h-10 text-sm rounded-lg border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_KINDS.map((k) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {CATEGORY_KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{kindHint}</p>
          </div>

          {kind === "redirect" ? (
            <div className="space-y-1.5">
              <Label htmlFor="category-redirect" className="text-[13px] font-medium text-foreground">Redirect URL</Label>
              <Input
                id="category-redirect"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://partner.example.com/tours"
                className="h-10 text-sm rounded-lg border-border"
              />
              {errors.redirectUrl ? (
                <p className="text-xs font-medium text-destructive">{errors.redirectUrl}</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-sort" className="text-[13px] font-medium text-foreground">Sort order</Label>
              <Input
                id="category-sort"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-10 text-sm rounded-lg border-border font-mono tabular-nums"
              />
              {errors.sortOrder ? (
                <p className="text-xs font-medium text-destructive">{errors.sortOrder}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category-icon" className="text-[13px] font-medium text-foreground">Icon (optional)</Label>
              <Input
                id="category-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. waves"
                className="h-10 text-sm rounded-lg border-border"
              />
              {errors.icon ? (
                <p className="text-xs font-medium text-destructive">{errors.icon}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3 shadow-xs">
            <div>
              <p className="text-sm font-medium leading-none text-foreground">Active</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inactive categories can&apos;t accept new listings.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Category active" />
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
              {editing ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
