"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveHomeSettingsAction } from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { HomeSettings } from "@/modules/settings/site-settings";

const SECTIONS: { key: "showHero" | "showFeatured" | "showCta" | "showStats" | "showTestimonials"; label: string; desc: string }[] = [
  { key: "showHero", label: "Hero", desc: "Headline, sub-copy, image and CTA button" },
  { key: "showFeatured", label: "Featured packages", desc: "Hand-picked trips grid" },
  { key: "showCta", label: "Call to action", desc: "Closing banner before the footer" },
  { key: "showStats", label: "Stats band", desc: "Trust figures and counters" },
  { key: "showTestimonials", label: "Testimonials", desc: "Customer reviews carousel" },
];

/** Per-section homepage visibility toggles (§2.11). Partial save — hero copy untouched. */
export default function HomeVisibilityCard({ initial }: { initial: HomeSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const [flags, setFlags] = useState({
    showHero: initial.showHero,
    showFeatured: initial.showFeatured,
    showCta: initial.showCta,
    showStats: initial.showStats,
    showTestimonials: initial.showTestimonials,
  });

  const save = () => {
    startTransition(async () => {
      const res = await saveHomeSettingsAction(flags);
      if (res.ok) {
        toast({ title: "Sections updated", description: "Homepage visibility saved." });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Could not save", description: res.error });
      }
    });
  };

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Homepage sections</CardTitle>
        <CardDescription className="text-xs">Show or hide each homepage block independently.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{section.label}</p>
              <p className="text-xs text-muted-foreground">{section.desc}</p>
            </div>
            <Switch
              checked={flags[section.key]}
              onCheckedChange={(v) => setFlags((f) => ({ ...f, [section.key]: v }))}
              aria-label={`Show ${section.label}`}
            />
          </div>
        ))}
        <Button onClick={save} disabled={busy} size="sm" className="h-9 text-xs">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save visibility
        </Button>
      </CardContent>
    </Card>
  );
}
