"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { saveFooterSettingsAction } from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/modules/settings/site-settings";

/** Footer config editor (§2.11): description, link columns (JSON), socials (JSON), copyright. */
export default function FooterSettingsCard({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(initial.footerDescription ?? "");
  const [columnsText, setColumnsText] = useState(
    initial.footerColumns.length > 0 ? JSON.stringify(initial.footerColumns, null, 2) : "",
  );
  const [socialsText, setSocialsText] = useState(
    initial.footerSocials.length > 0 ? JSON.stringify(initial.footerSocials, null, 2) : "",
  );
  const [copyright, setCopyright] = useState(initial.copyright ?? "");

  const save = () => {
    setError(null);
    let columns = undefined;
    let socials = undefined;
    try {
      columns = columnsText.trim() ? JSON.parse(columnsText) : [];
      socials = socialsText.trim() ? JSON.parse(socialsText) : [];
    } catch {
      setError("Columns and socials must be valid JSON arrays.");
      return;
    }
    startTransition(async () => {
      const res = await saveFooterSettingsAction({
        footerDescription: description,
        footerColumns: columns,
        footerSocials: socials,
        copyright,
      });
      if (res.ok) {
        toast({ title: "Footer saved", description: "Public footer config updated." });
        router.refresh();
      } else {
        setError(res.error || "Could not save footer.");
      }
    });
  };

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Footer</CardTitle>
        <CardDescription className="text-xs">
          Professional agency footer: description, up to 4 link columns (12 links each), up to 8 socials.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="footer-desc" className="text-xs font-medium">Footer description</Label>
          <Textarea id="footer-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="footer-cols" className="text-xs font-medium">Link columns (JSON)</Label>
          <Textarea
            id="footer-cols"
            value={columnsText}
            onChange={(e) => setColumnsText(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder='[{"title":"Explore","links":[{"label":"Packages","href":"/packages"}]}]'
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="footer-socials" className="text-xs font-medium">Socials (JSON)</Label>
          <Textarea
            id="footer-socials"
            value={socialsText}
            onChange={(e) => setSocialsText(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder='[{"network":"facebook","href":"https://facebook.com/..."}]'
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">Networks: facebook, instagram, youtube, twitter, linkedin (others get a globe icon).</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="footer-copy" className="text-xs font-medium">Copyright line</Label>
          <Input id="footer-copy" value={copyright} onChange={(e) => setCopyright(e.target.value)} placeholder="© 2026 TripMate. All rights reserved." className="h-10 text-xs" />
        </div>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
        <Button onClick={save} disabled={busy} size="sm" className="h-9 text-xs">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save footer
        </Button>
      </CardContent>
    </Card>
  );
}
