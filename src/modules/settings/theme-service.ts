import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSetting, setSetting } from "./service";
import {
  DEFAULT_THEME_SETTINGS,
  THEME_TEMPLATES,
  resolveThemeTemplateKey,
  type CustomThemePreset,
  type ThemeColors,
  type ThemeSettings,
  type ThemeTemplateKey,
} from "./theme";

export async function getThemeSettings(): Promise<ThemeSettings> {
  const raw = await getSetting("theme");
  if (!raw || typeof raw !== "object") return DEFAULT_THEME_SETTINGS;

  const row = raw as Record<string, unknown>;
  // resolveThemeTemplateKey maps legacy keys (e.g. "flightblu" → "azure") so
  // sites saved under a retired key keep the identical palette.
  const templateKey = resolveThemeTemplateKey(
    typeof row.template === "string" ? row.template : "",
  );
  const baseTemplate = THEME_TEMPLATES[templateKey ?? "signature"];
  const customColors = (
    row.colors && typeof row.colors === "object" ? row.colors : {}
  ) as Record<string, unknown>;

  const mergedColors: ThemeColors = { ...baseTemplate.colors };
  (Object.keys(baseTemplate.colors) as (keyof ThemeColors)[]).forEach((key) => {
    if (typeof customColors[key] === "string" && customColors[key].trim()) {
      mergedColors[key] = (customColors[key] as string).trim();
    }
  });

  const customPresets = Array.isArray(row.customPresets)
    ? (row.customPresets as CustomThemePreset[]).filter(
        (p) => p && typeof p.id === "string" && typeof p.name === "string" && p.colors,
      )
    : [];

  return {
    template: templateKey ?? "signature",
    colors: mergedColors,
    customPresets,
  };
}

export async function updateThemeSettings(input: {
  template: ThemeTemplateKey;
  colors?: Partial<ThemeColors>;
}): Promise<ThemeSettings> {
  const current = await getThemeSettings();
  const baseTemplate = THEME_TEMPLATES[input.template] ?? THEME_TEMPLATES.signature;
  const mergedColors: ThemeColors = {
    ...baseTemplate.colors,
    ...(input.colors ?? {}),
  };

  const payload: ThemeSettings = {
    template: input.template,
    colors: mergedColors,
    customPresets: current.customPresets ?? [],
  };

  await setSetting("theme", payload);
  return payload;
}

export async function saveCustomPreset(input: {
  id?: string;
  name: string;
  colors: ThemeColors;
}): Promise<CustomThemePreset[]> {
  const current = await getThemeSettings();
  const now = new Date().toISOString();
  const id =
    input.id?.trim() ||
    `custom-${now.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
  const existing = (current.customPresets ?? []).filter((p) => p.id !== id);
  const preset: CustomThemePreset = {
    id,
    name: input.name.trim().slice(0, 80) || "Custom preset",
    colors: { ...input.colors },
    createdAt:
      current.customPresets?.find((p) => p.id === id)?.createdAt ?? now,
    updatedAt: now,
  };
  const next = [...existing, preset];
  await setSetting("theme", {
    template: current.template,
    colors: current.colors,
    customPresets: next,
  });
  return next;
}

export async function deleteCustomPreset(id: string): Promise<CustomThemePreset[]> {
  const current = await getThemeSettings();
  const next = (current.customPresets ?? []).filter((p) => p.id !== id);
  await setSetting("theme", {
    template: current.template === "custom" ? "signature" : current.template,
    colors: current.colors,
    customPresets: next,
  });
  return next;
}

export async function getPublicThemeSettings(): Promise<ThemeSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  return getThemeSettings();
}
