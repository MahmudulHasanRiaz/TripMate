import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSetting, setSetting } from "./service";
import {
  DEFAULT_THEME_SETTINGS,
  THEME_TEMPLATES,
  type ThemeColors,
  type ThemeSettings,
  type ThemeTemplateKey,
} from "./theme";

export async function getThemeSettings(): Promise<ThemeSettings> {
  const raw = await getSetting("theme");
  if (!raw || typeof raw !== "object") return DEFAULT_THEME_SETTINGS;

  const row = raw as Record<string, unknown>;
  const templateKey = (
    typeof row.template === "string" && row.template in THEME_TEMPLATES
      ? row.template
      : "signature"
  ) as ThemeTemplateKey;

  const baseTemplate = THEME_TEMPLATES[templateKey];
  const customColors = (
    row.colors && typeof row.colors === "object" ? row.colors : {}
  ) as Record<string, unknown>;

  const mergedColors: ThemeColors = { ...baseTemplate.colors };
  (Object.keys(baseTemplate.colors) as (keyof ThemeColors)[]).forEach((key) => {
    if (typeof customColors[key] === "string" && customColors[key].trim()) {
      mergedColors[key] = (customColors[key] as string).trim();
    }
  });

  return {
    template: templateKey,
    colors: mergedColors,
  };
}

export async function updateThemeSettings(input: {
  template: ThemeTemplateKey;
  colors?: Partial<ThemeColors>;
}): Promise<ThemeSettings> {
  const baseTemplate = THEME_TEMPLATES[input.template] ?? THEME_TEMPLATES.signature;
  const mergedColors: ThemeColors = {
    ...baseTemplate.colors,
    ...(input.colors ?? {}),
  };

  const payload: ThemeSettings = {
    template: input.template,
    colors: mergedColors,
  };

  await setSetting("theme", payload);
  return payload;
}

export async function getPublicThemeSettings(): Promise<ThemeSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  return getThemeSettings();
}
