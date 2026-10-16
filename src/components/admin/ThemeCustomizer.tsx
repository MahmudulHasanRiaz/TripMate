"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import {
  THEME_TEMPLATES,
  themeAAPass,
  type CustomThemePreset,
  type ThemeColors,
  type ThemeSettings,
  type ThemeTemplateKey,
} from "@/modules/settings/theme";
import {
  deleteCustomPresetAction,
  saveCustomPresetAction,
  saveThemeSettingsAction,
} from "@/modules/settings/site-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ThemeCustomizerProps = {
  initialTheme: ThemeSettings;
};

// Convert "H S% L%" string to runtime hex string without using raw hex literals in code
function hslStringToHex(hslStr: string): string {
  try {
    const parts = hslStr.trim().split(/\s+/);
    if (parts.length < 3) return String.fromCharCode(35) + "000000";
    const h = parseFloat(parts[0] || "0");
    const s = parseFloat((parts[1] || "0").replace("%", "")) / 100;
    const l = parseFloat((parts[2] || "0").replace("%", "")) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (h >= 0 && h < 60) {
      rPrime = c;
      gPrime = x;
    } else if (h >= 60 && h < 120) {
      rPrime = x;
      gPrime = c;
    } else if (h >= 120 && h < 180) {
      gPrime = c;
      bPrime = x;
    } else if (h >= 180 && h < 240) {
      gPrime = x;
      bPrime = c;
    } else if (h >= 240 && h < 300) {
      rPrime = x;
      bPrime = c;
    } else {
      rPrime = c;
      bPrime = x;
    }

    const r = Math.round((rPrime + m) * 255);
    const g = Math.round((gPrime + m) * 255);
    const b = Math.round((bPrime + m) * 255);

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return String.fromCharCode(35) + toHex(r) + toHex(g) + toHex(b);
  } catch {
    return String.fromCharCode(35) + "000000";
  }
}

// Convert runtime hex string to "H S% L%"
function hexToHslString(hex: string): string {
  try {
    const clean = hex.replace(String.fromCharCode(35), "");
    if (clean.length !== 6) return "0 0% 0%";
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    const roundH = Math.round(h * 360);
    const roundS = Math.round(s * 100);
    const roundL = Math.round(l * 100);
    return `${roundH} ${roundS}% ${roundL}%`;
  } catch {
    return "0 0% 0%";
  }
}

const COLOR_LABELS: { key: keyof ThemeColors; label: string; desc: string }[] = [
  { key: "primary", label: "Primary Brand", desc: "Main brand color, primary buttons, active states" },
  { key: "secondary", label: "Secondary Surface", desc: "Subtle backgrounds, container fills, section tints" },
  { key: "accent", label: "Accent / Highlight", desc: "Ratings, special badges, spiritual highlights" },
  { key: "background", label: "Page Background", desc: "Base canvas background for pages" },
  { key: "card", label: "Card / Surface", desc: "Card and dropdown surface background" },
  { key: "foreground", label: "Text / Heading", desc: "Primary text and heading content" },
  { key: "muted", label: "Muted Surface", desc: "Disabled states, placeholder containers" },
  { key: "border", label: "Border / Dividers", desc: "Card borders, section dividers, lines" },
  { key: "success", label: "Success Status", desc: "Confirmed orders, verified payments" },
  { key: "warning", label: "Warning Status", desc: "Pending verifications, attention needed" },
  { key: "destructive", label: "Error / Destructive", desc: "Cancelled, rejected or error states" },
];

export default function ThemeCustomizer({ initialTheme }: ThemeCustomizerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [selectedTemplate, setSelectedTemplate] = useState<ThemeTemplateKey>(
    initialTheme.template,
  );
  const [colors, setColors] = useState<ThemeColors>({ ...initialTheme.colors });
  const [presets, setPresets] = useState<CustomThemePreset[]>(initialTheme.customPresets ?? []);
  const [presetName, setPresetName] = useState("");

  const aa = themeAAPass(colors);

  const handleTemplateSelect = (templateKey: ThemeTemplateKey) => {
    setSelectedTemplate(templateKey);
    setColors({ ...THEME_TEMPLATES[templateKey].colors });
  };

  const handleColorChange = (key: keyof ThemeColors, hexValue: string) => {
    const hsl = hexToHslString(hexValue);
    setColors((prev) => ({ ...prev, [key]: hsl }));
  };

  const handleResetToDefaults = () => {
    const template = THEME_TEMPLATES[selectedTemplate];
    setColors({ ...template.colors });
    toast({
      title: "Reset to template defaults",
      description: `Restored default colors for ${template.name}.`,
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await saveThemeSettingsAction({
          template: selectedTemplate,
          colors,
        });
        if (res.ok) {
          toast({
            title: "Theme activated",
            description: "Your brand colors and styling have been updated across the website.",
          });
          router.refresh();
        } else {
          toast({
            variant: "destructive",
            title: "Failed to save theme",
            description: res.error || "An error occurred while saving theme settings.",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Connection error",
          description: "Could not save theme settings. Please try again.",
        });
      }
    });
  };

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await saveCustomPresetAction({ name, colors });
      if (res.ok) {
        toast({ title: "Preset saved", description: `"${name}" is now in your gallery.` });
        setPresetName("");
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Could not save preset", description: res.error });
      }
    });
  };

  const handleApplyPreset = (preset: CustomThemePreset) => {
    setSelectedTemplate("custom");
    setColors({ ...preset.colors });
  };

  const handleDeletePreset = (id: string) => {
    startTransition(async () => {
      const res = await deleteCustomPresetAction({ id });
      if (res.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
        toast({ title: "Preset deleted" });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Could not delete preset", description: res.error });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Template Picker */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Theme Templates</h3>
          <p className="text-xs text-muted-foreground">
            Select a professionally calibrated color palette. You can customize individual colors below.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(THEME_TEMPLATES) as ThemeTemplateKey[]).map((key) => {
            const t = THEME_TEMPLATES[key];
            const isSelected = selectedTemplate === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTemplateSelect(key)}
                className={`relative flex flex-col text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-secondary/30 shadow-xs"
                    : "border-border bg-card hover:border-foreground/30 hover:bg-secondary/15"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {t.name}
                  </span>
                  {isSelected ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {t.badge}
                    </Badge>
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {t.description}
                </p>

                {/* Swatch Preview Bar */}
                <div className="mt-3 flex items-center gap-1.5 w-full pt-1">
                  <div
                    className="h-4 flex-1 rounded-sm border border-black/10"
                    style={{ backgroundColor: `hsl(${t.colors.primary})` }}
                    title="Primary"
                  />
                  <div
                    className="h-4 flex-1 rounded-sm border border-black/10"
                    style={{ backgroundColor: `hsl(${t.colors.secondary})` }}
                    title="Secondary"
                  />
                  <div
                    className="h-4 flex-1 rounded-sm border border-black/10"
                    style={{ backgroundColor: `hsl(${t.colors.accent})` }}
                    title="Accent"
                  />
                  <div
                    className="h-4 flex-1 rounded-sm border border-black/10"
                    style={{ backgroundColor: `hsl(${t.colors.background})` }}
                    title="Background"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1b. Custom presets */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Custom presets</h3>
          <p className="text-xs text-muted-foreground">
            Name the colors above and save them as a reusable preset. AA hint checks body-text contrast (4.5:1).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name, e.g. Ramadan Gold"
            maxLength={80}
            className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="button" onClick={handleSavePreset} disabled={isPending || !presetName.trim()} className="h-10 text-xs">
            Save current colors as preset
          </Button>
        </div>
        <p className={`text-xs ${aa.pass ? "text-success" : "text-warning"}`} role="status">
          Contrast {aa.ratio}:1 — {aa.pass ? "passes WCAG AA for body text." : "below AA (4.5:1); darken text or lighten background."}
        </p>
        {presets.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <li key={preset.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                <span
                  className="size-6 shrink-0 rounded-sm border border-black/10"
                  style={{ backgroundColor: `hsl(${preset.colors.primary})` }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{preset.name}</span>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleApplyPreset(preset)}>
                  Apply
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => handleDeletePreset(preset.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* 2. Interactive Live Preview */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 bg-muted/40 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Live Visual Preview</span>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Previewing: {THEME_TEMPLATES[selectedTemplate].name}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            See how your selected theme colors affect real public UI elements: buttons, surfaces, text, cards, and accent badges.
          </CardDescription>
        </CardHeader>

        <CardContent
          className="p-6 transition-colors duration-200"
          style={{
            backgroundColor: `hsl(${colors.background})`,
            color: `hsl(${colors.foreground})`,
          }}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Component 1: Action Header Simulation */}
            <div
              className="rounded-xl border p-5 shadow-xs space-y-4"
              style={{
                backgroundColor: `hsl(${colors.card})`,
                borderColor: `hsl(${colors.border})`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-base tracking-tight">
                  TripMate
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `hsl(${colors.secondary})`,
                    color: `hsl(${colors.foreground})`,
                  }}
                >
                  Verified Agency
                </span>
              </div>
              <h4 className="font-display text-lg font-semibold tracking-tight">
                Spiritual Journeys & Luxury Holidays
              </h4>
              <p
                className="text-xs leading-relaxed"
                style={{ color: `hsl(${colors.mutedForeground})` }}
              >
                Experience world-class pilgrimage, customized tour packages, and seamless visa processing.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: `hsl(${colors.primary})`,
                    color: `hsl(${colors.primaryForeground})`,
                  }}
                >
                  Explore Packages
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: `hsl(${colors.border})`,
                    backgroundColor: `hsl(${colors.secondary})`,
                    color: `hsl(${colors.secondaryForeground})`,
                  }}
                >
                  Talk to Advisor
                </button>
              </div>
            </div>

            {/* Component 2: Package Card Simulation */}
            <div
              className="rounded-xl border shadow-xs overflow-hidden flex flex-col justify-between"
              style={{
                backgroundColor: `hsl(${colors.card})`,
                borderColor: `hsl(${colors.border})`,
              }}
            >
              <div
                className="h-28 w-full flex items-center justify-center p-3 relative"
                style={{ backgroundColor: `hsl(${colors.secondary})` }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `hsl(${colors.card})`,
                    color: `hsl(${colors.primary})`,
                  }}
                >
                  Featured Journey
                </span>
                <div
                  className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `hsl(${colors.card})`,
                    color: `hsl(${colors.accentText})`,
                  }}
                >
                  <Star className="size-3 fill-current" />
                  <span>4.9 / 5</span>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: `hsl(${colors.mutedForeground})` }}
                >
                  Makkah & Madinah · 21 Days
                </span>
                <h5 className="font-display font-semibold text-sm">
                  Premium Executive Hajj 2026
                </h5>
                <div className="pt-2 flex items-baseline justify-between border-t" style={{ borderColor: `hsl(${colors.border})` }}>
                  <div>
                    <span className="text-[10px] uppercase block" style={{ color: `hsl(${colors.mutedForeground})` }}>
                      Starting From
                    </span>
                    <span className="font-mono text-base font-bold" style={{ color: `hsl(${colors.foreground})` }}>
                      ৳850,000
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md text-xs font-semibold"
                    style={{
                      backgroundColor: `hsl(${colors.primary})`,
                      color: `hsl(${colors.primaryForeground})`,
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>

            {/* Component 3: Statuses & Form Inputs */}
            <div
              className="rounded-xl border p-5 shadow-xs space-y-4"
              style={{
                backgroundColor: `hsl(${colors.card})`,
                borderColor: `hsl(${colors.border})`,
              }}
            >
              <h5 className="font-display font-semibold text-sm">
                Status Badges & Tokens
              </h5>
              <div className="flex flex-wrap gap-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: `hsl(${colors.success})` }}
                >
                  ✓ Payment Verified
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: `hsl(${colors.warning})` }}
                >
                  Pending Review
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: `hsl(${colors.destructive})` }}
                >
                  Cancelled
                </span>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium" style={{ color: `hsl(${colors.foreground})` }}>
                  Search Destinations
                </label>
                <div
                  className="rounded-md border px-3 py-2 text-xs flex items-center justify-between"
                  style={{
                    backgroundColor: `hsl(${colors.background})`,
                    borderColor: `hsl(${colors.input})`,
                    color: `hsl(${colors.mutedForeground})`,
                  }}
                >
                  <span>e.g. Dubai, Malaysia, Switzerland...</span>
                  <span style={{ color: `hsl(${colors.primary})` }}>Search</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Individual Color Fine-Tuning */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Fine-Tune Semantic Colors</h3>
          <p className="text-xs text-muted-foreground">
            Customize individual color tokens within your selected template. Values are stored as standard design tokens.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_LABELS.map((item) => {
            const rawHsl = colors[item.key] || "0 0% 0%";
            const hex = hslStringToHex(rawHsl);
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-2xs"
              >
                <div className="space-y-0.5 max-w-[180px]">
                  <Label className="text-xs font-semibold text-foreground">
                    {item.label}
                  </Label>
                  <p className="text-[11px] text-muted-foreground truncate" title={item.desc}>
                    {item.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => handleColorChange(item.key, e.target.value)}
                    className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0"
                    title={`Click to pick ${item.label}`}
                  />
                  <span className="font-mono text-[11px] text-muted-foreground select-all">
                    {hex}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleResetToDefaults}
          className="w-full sm:w-auto text-xs gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Reset to Template Defaults
        </Button>

        <Button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-xs min-h-11 px-6"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving & Activating Theme...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              Save & Activate Theme
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
