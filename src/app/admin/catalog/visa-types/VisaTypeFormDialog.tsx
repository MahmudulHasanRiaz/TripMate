"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { slugify } from "@/modules/catalog/validation";
import { saveVisaTypeAction } from "@/modules/catalog/visa-actions";
import type { VisaType } from "@/modules/catalog/visa-service";
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

export default function VisaTypeFormDialog({
  type,
  open,
  onOpenChange,
}: {
  type?: VisaType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(type?.name ?? "");
  const [slug, setSlug] = useState(type?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(type));
  const [description, setDescription] = useState(type?.description ?? "");
  const [icon, setIcon] = useState(type?.icon ?? "passport");
  const [sortOrder, setSortOrder] = useState(type?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(type?.isActive ?? true);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      const generated = slugify(val);
      if (generated) setSlug(generated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await saveVisaTypeAction({
        id: type?.id,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{type ? "Edit Visa Type" : "New Visa Type"}</DialogTitle>
          <DialogDescription>
            Country-agnostic category (e.g. Tourist, Business, Student, Work, Transit) used to filter visa offerings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="typeName">Type Name *</Label>
            <Input
              id="typeName"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Tourist Visa"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="typeSlug">URL Slug *</Label>
            <Input
              id="typeSlug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="e.g. tourist-visa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="typeIcon">Icon Identifier</Label>
              <Input
                id="typeIcon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. passport, plane"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="typeSort">Sort Order</Label>
              <Input
                id="typeSort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="typeDesc">Description</Label>
            <Textarea
              id="typeDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short blurb explaining this visa class..."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <div className="text-sm font-medium text-foreground">Active Status</div>
              <div className="text-xs text-muted-foreground">
                Display this visa type in filters and customer selector
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
              {type ? "Save Changes" : "Create Visa Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
