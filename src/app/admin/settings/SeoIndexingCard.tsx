"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { setSearchVisibilityAction } from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/** SEO & Indexing section (§2.2): the single visibility switch + what it drives. */
export default function SeoIndexingCard({ initial }: { initial: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial);

  const save = (value: boolean) => {
    setEnabled(value);
    startTransition(async () => {
      const res = await setSearchVisibilityAction({ searchEngineVisibility: value });
      if (res.ok) {
        toast({
          title: value ? "Indexing enabled" : "Indexing disabled",
          description: value
            ? "Search engines may index the public site."
            : "robots.txt disallows all, sitemap is empty, noindex is served.",
        });
        router.refresh();
      } else {
        setEnabled(!value);
        toast({ variant: "destructive", title: "Could not save", description: res.error });
      }
    });
  };

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
          Search engine indexing
        </CardTitle>
        <CardDescription className="text-xs">
          One switch drives robots.txt, sitemap.xml and page metadata together. Fresh installs start OFF.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Allow search engines to index</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? "Indexing on — public pages are crawlable." : "Indexing off — crawlers are asked to stay out."}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={save} disabled={busy} aria-label="Allow search engines to index" />
        </div>
        {busy ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Saving…
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
