"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { saveFooterSettingsAction } from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FooterColumn,
  FooterLink,
  FooterSocial,
  SiteSettings,
} from "@/modules/settings/site-settings";

const SOCIAL_NETWORKS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other / Website" },
] as const;

function isValidUrlOrPath(val: string): boolean {
  if (!val.trim()) return true;
  if (val.startsWith("/") && !val.startsWith("//")) return true;
  try {
    const u = new URL(val);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Footer config editor with field-based controls (no raw JSON) */
export default function FooterSettingsCard({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(initial.footerDescription ?? "");
  const [copyright, setCopyright] = useState(initial.copyright ?? "");

  // Structured columns state
  const [columns, setColumns] = useState<FooterColumn[]>(() => {
    return Array.isArray(initial.footerColumns) && initial.footerColumns.length > 0
      ? initial.footerColumns.map((c) => ({
          title: c.title || "",
          links: Array.isArray(c.links)
            ? c.links.map((l) => ({ label: l.label || "", href: l.href || "" }))
            : [],
        }))
      : [];
  });

  // Structured socials state
  const [socials, setSocials] = useState<FooterSocial[]>(() => {
    return Array.isArray(initial.footerSocials) && initial.footerSocials.length > 0
      ? initial.footerSocials.map((s) => ({
          network: s.network || "facebook",
          href: s.href || "",
        }))
      : [];
  });

  // Column operations
  const addColumn = () => {
    if (columns.length >= 4) return;
    setColumns([...columns, { title: "", links: [{ label: "", href: "" }] }]);
  };

  const removeColumn = (colIdx: number) => {
    setColumns(columns.filter((_, i) => i !== colIdx));
  };

  const updateColumnTitle = (colIdx: number, title: string) => {
    const updated = [...columns];
    updated[colIdx] = { ...updated[colIdx], title };
    setColumns(updated);
  };

  const addLink = (colIdx: number) => {
    const col = columns[colIdx];
    if (col.links.length >= 12) return;
    const updated = [...columns];
    updated[colIdx] = {
      ...col,
      links: [...col.links, { label: "", href: "" }],
    };
    setColumns(updated);
  };

  const removeLink = (colIdx: number, linkIdx: number) => {
    const col = columns[colIdx];
    const updated = [...columns];
    updated[colIdx] = {
      ...col,
      links: col.links.filter((_, i) => i !== linkIdx),
    };
    setColumns(updated);
  };

  const updateLink = (
    colIdx: number,
    linkIdx: number,
    field: "label" | "href",
    val: string,
  ) => {
    const col = columns[colIdx];
    const updatedLinks = [...col.links];
    updatedLinks[linkIdx] = { ...updatedLinks[linkIdx], [field]: val };
    const updated = [...columns];
    updated[colIdx] = { ...col, links: updatedLinks };
    setColumns(updated);
  };

  // Social operations
  const addSocial = () => {
    if (socials.length >= 8) return;
    setSocials([...socials, { network: "facebook", href: "" }]);
  };

  const removeSocial = (idx: number) => {
    setSocials(socials.filter((_, i) => i !== idx));
  };

  const updateSocial = (idx: number, field: "network" | "href", val: string) => {
    const updated = [...socials];
    updated[idx] = { ...updated[idx], [field]: val };
    setSocials(updated);
  };

  const save = () => {
    setError(null);

    // Validate and clean columns:
    // Empty rows are ignored; partially filled rows must have both label and valid href.
    const cleanColumns: FooterColumn[] = [];
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const title = col.title.trim();
      const validLinks: FooterLink[] = [];

      for (let l = 0; l < col.links.length; l++) {
        const link = col.links[l];
        const label = link.label.trim();
        const href = link.href.trim();

        if (!label && !href) continue; // skip entirely empty link row

        if (!label) {
          setError(`Column "${title || c + 1}" link #${l + 1} is missing a label.`);
          return;
        }
        if (!href) {
          setError(`Column "${title || c + 1}" link "${label}" is missing a destination URL.`);
          return;
        }
        if (!isValidUrlOrPath(href)) {
          setError(
            `Link "${label}" has an invalid URL or path. Enter full https:// URL or internal path starting with /`,
          );
          return;
        }
        validLinks.push({ label, href });
      }

      if (title || validLinks.length > 0) {
        if (!title) {
          setError(`Column #${c + 1} must have a title.`);
          return;
        }
        cleanColumns.push({ title, links: validLinks });
      }
    }

    // Validate and clean socials
    const cleanSocials: FooterSocial[] = [];
    for (let s = 0; s < socials.length; s++) {
      const soc = socials[s];
      const href = soc.href.trim();
      if (!href) continue; // ignore empty social row

      if (!isValidUrlOrPath(href)) {
        setError(`Social link for "${soc.network}" has an invalid URL.`);
        return;
      }
      cleanSocials.push({ network: soc.network, href });
    }

    startTransition(async () => {
      const res = await saveFooterSettingsAction({
        footerDescription: description.trim() || undefined,
        footerColumns: cleanColumns,
        footerSocials: cleanSocials,
        copyright: copyright.trim() || undefined,
      });

      if (res.ok) {
        toast({ title: "Footer saved", description: "Public footer configuration updated." });
        router.refresh();
      } else {
        setError(res.error || "Could not save footer.");
      }
    });
  };

  return (
    <Card className="shadow-xs border-border bg-card">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/60">
        <CardTitle className="text-base font-semibold">Footer Configuration</CardTitle>
        <CardDescription className="text-xs">
          Manage your agency footer: description, navigation link columns, social media links, and copyright notice.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="footer-desc" className="text-xs font-medium">
            Footer Bio / Description
          </Label>
          <Textarea
            id="footer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-xs min-h-[48px]"
            placeholder="A short agency bio displayed below the logo in the footer."
          />
        </div>

        {/* Link Columns Section */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Navigation Columns</h3>
              <p className="text-xs text-muted-foreground">
                Up to 4 columns (e.g. &ldquo;Explore&rdquo;, &ldquo;Packages&rdquo;, &ldquo;Company&rdquo;) with up to 12 links each.
              </p>
            </div>
            {columns.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="h-8 gap-1.5 text-xs rounded-lg self-start sm:self-auto"
              >
                <Plus className="size-3.5" /> Add Column
              </Button>
            )}
          </div>

          {columns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground">No custom footer link columns added.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addColumn}
                className="mt-1 text-xs text-primary hover:text-primary"
              >
                + Add your first link column
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {columns.map((col, colIdx) => (
                <div
                  key={colIdx}
                  className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={col.title}
                      onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                      placeholder="Column Title (e.g. Services)"
                      className="h-9 text-xs font-semibold rounded-lg flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeColumn(colIdx)}
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                      title="Remove column"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Links inside column */}
                  <div className="space-y-2">
                    {col.links.map((link, linkIdx) => {
                      const isInvalid = !isValidUrlOrPath(link.href);
                      return (
                        <div key={linkIdx} className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={link.label}
                              onChange={(e) =>
                                updateLink(colIdx, linkIdx, "label", e.target.value)
                              }
                              placeholder="Label (e.g. Umrah)"
                              className="h-8 text-xs rounded-md w-2/5"
                            />
                            <Input
                              value={link.href}
                              onChange={(e) =>
                                updateLink(colIdx, linkIdx, "href", e.target.value)
                              }
                              placeholder="/packages/umrah or https://..."
                              className="h-8 text-xs rounded-md flex-1 font-mono"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLink(colIdx, linkIdx)}
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                          {link.href.trim() && isInvalid && (
                            <p className="text-[11px] text-destructive flex items-center gap-1 pl-1">
                              <AlertCircle className="size-3" />
                              Must start with / or https://
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {col.links.length < 12 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addLink(colIdx)}
                        className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
                      >
                        <Plus className="size-3" /> Add Link
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Socials Section */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Share2 className="size-4 text-primary" /> Social Channels
              </h3>
              <p className="text-xs text-muted-foreground">
                Connect your brand social media profiles. Up to 8 links.
              </p>
            </div>
            {socials.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocial}
                className="h-8 gap-1.5 text-xs rounded-lg self-start sm:self-auto"
              >
                <Plus className="size-3.5" /> Add Social Profile
              </Button>
            )}
          </div>

          {socials.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground">No social media links added yet.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSocial}
                className="mt-1 text-xs text-primary hover:text-primary"
              >
                + Add Facebook, WhatsApp, or Instagram
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {socials.map((soc, idx) => {
                const isInvalid = !isValidUrlOrPath(soc.href);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border border-border bg-card">
                      <div className="w-full sm:w-44">
                        <Select
                          value={soc.network}
                          onValueChange={(val) => updateSocial(idx, "network", val)}
                        >
                          <SelectTrigger className="h-9 text-xs rounded-md">
                            <SelectValue placeholder="Network" />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_NETWORKS.map((n) => (
                              <SelectItem key={n.value} value={n.value} className="text-xs">
                                {n.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex-1">
                        <Input
                          value={soc.href}
                          onChange={(e) => updateSocial(idx, "href", e.target.value)}
                          placeholder="https://facebook.com/yourbrand or WhatsApp link"
                          className="h-9 text-xs rounded-md font-mono"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSocial(idx)}
                        className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0 self-end sm:self-auto"
                        title="Remove social link"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    {soc.href.trim() && isInvalid && (
                      <p className="text-[11px] text-destructive flex items-center gap-1 pl-1">
                        <AlertCircle className="size-3" />
                        Enter a valid URL (starting with https:// or http://)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <Label htmlFor="footer-copy" className="text-xs font-medium">
            Copyright Notice
          </Label>
          <Input
            id="footer-copy"
            value={copyright}
            onChange={(e) => setCopyright(e.target.value)}
            placeholder="© 2026 TripMate. All rights reserved."
            className="h-10 text-xs rounded-lg"
          />
        </div>

        {error && (
          <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={save}
            disabled={busy}
            className="h-10 text-xs font-semibold px-5 rounded-lg gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save Footer Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
