"use client";

import { useState } from "react";
import { Globe, Info, Loader2, Save, Sparkles } from "lucide-react";
import { saveEntitySeoAction } from "@/modules/settings/seo-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type SeoConfigDrawerProps = {
  entityType: "listing" | "post" | "destination";
  entityId: string;
  entityTitle: string;
  entitySlug: string;
  initialSeo?: { title?: string | null; description?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (seo: { title: string; description: string }) => void;
};

export default function SeoConfigDrawer({
  entityType,
  entityId,
  entityTitle,
  entitySlug,
  initialSeo,
  open,
  onOpenChange,
  onSaved,
}: SeoConfigDrawerProps) {
  const [title, setTitle] = useState(initialSeo?.title ?? "");
  const [description, setDescription] = useState(initialSeo?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayTitle = title.trim() || `${entityTitle} · TripMate`;
  const displayDesc =
    description.trim() ||
    `Explore ${entityTitle} with TripMate. Complete travel services, verified pricing, and expert guidance.`;

  const baseUrl =
    entityType === "listing"
      ? `https://tripmate.agency/packages/${entitySlug}`
      : entityType === "post"
        ? `https://tripmate.agency/blog/${entitySlug}`
        : `https://tripmate.agency/destinations/${entitySlug}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await saveEntitySeoAction({
        entityType,
        entityId,
        seo: {
          title: title.trim(),
          description: description.trim(),
        },
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setSuccess(true);
      onSaved?.({ title: title.trim(), description: description.trim() });
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 700);
    } catch {
      setError("Failed to save SEO settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Globe className="size-4" />
            <span>Search Engine Optimization</span>
          </div>
          <SheetTitle className="text-xl font-bold">SEO Configuration</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Customize search engine preview metadata, title tags, and rich snippets for &ldquo;{entityTitle}&rdquo;.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-6 py-6">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              SEO metadata saved successfully!
            </div>
          )}

          {/* Google SERP Live Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Google Search Snippet Preview
            </Label>
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-1.5 font-sans">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px]">
                  G
                </span>
                <span className="truncate max-w-[280px] text-xs opacity-80">{baseUrl}</span>
              </div>
              <div className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline line-clamp-1 cursor-pointer">
                {displayTitle}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {displayDesc}
              </p>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-title">SEO Page Title</Label>
                <span
                  className={`text-xs ${
                    title.length > 60
                      ? "text-amber-500 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {title.length} / 70
                </span>
              </div>
              <Input
                id="seo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${entityTitle} · TripMate`}
                maxLength={70}
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                Optimal length is 50–60 characters. Search engines typically truncate titles over 65 characters.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo-description">Meta Description</Label>
                <span
                  className={`text-xs ${
                    description.length > 150
                      ? "text-amber-500 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  {description.length} / 160
                </span>
              </div>
              <Textarea
                id="seo-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write an appealing summary to maximize click-through rate from search engines..."
                maxLength={160}
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                Optimal length is 140–160 characters. Highlight key inclusions, starting rates, or guarantees.
              </p>
            </div>
          </div>

          {/* Best Practices Note */}
          <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="size-3.5 text-primary" />
              SEO Best Practices
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px]">
              <li>Leave blank to inherit automatic dynamic page titles and descriptions.</li>
              <li>Include target destination keywords and pricing points for higher CTR.</li>
              <li>Changes reflect automatically on search engine crawler re-indexing.</li>
            </ul>
          </div>

          <SheetFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save SEO Settings
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
