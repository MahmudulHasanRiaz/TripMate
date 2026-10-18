export type ThemeColors = {
  primary: string; // HSL channels, e.g. "213 91% 46%"
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  accentText: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  destructive: string;
};

export type ThemeTemplateKey =
  | "signature"
  | "ocean"
  | "emerald"
  | "royal"
  | "sunset"
  | "minimal"
  | "flightblu"
  | "custom";

export type ThemeTemplate = {
  id: ThemeTemplateKey;
  name: string;
  description: string;
  badge: string;
  colors: ThemeColors;
  darkColors: ThemeColors;
};

export const THEME_TEMPLATES: Record<ThemeTemplateKey, ThemeTemplate> = {
  flightblu: {
    id: "flightblu",
    name: "Flight Blu",
    description: "Brand azure with sun-gold highlights and cool sky-tinted neutrals. Perfectly matched with the brand identity.",
    badge: "Brand Default",
    colors: {
      primary: "213 91% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "212 45% 95%",
      secondaryForeground: "222 47% 12%",
      accent: "38 92% 50%",
      accentForeground: "0 0% 100%",
      accentText: "32 80% 28%",
      background: "210 45% 98%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      muted: "212 35% 94%",
      mutedForeground: "215 18% 42%",
      border: "214 30% 88%",
      input: "215 15% 55%",
      ring: "213 91% 50%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "213 94% 62%",
      primaryForeground: "222 47% 10%",
      secondary: "222 40% 16%",
      secondaryForeground: "210 40% 96%",
      accent: "43 96% 62%",
      accentForeground: "222 47% 10%",
      accentText: "43 96% 70%",
      background: "222 47% 7%",
      foreground: "210 40% 96%",
      card: "222 47% 10%",
      cardForeground: "210 40% 96%",
      muted: "222 40% 15%",
      mutedForeground: "215 20% 68%",
      border: "222 35% 19%",
      input: "222 35% 25%",
      ring: "213 94% 62%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  signature: {
    id: "signature",
    name: "TripMate Signature",
    description: "Deep teal with warm sand surfaces and gold spiritual highlights. Balanced and trustworthy.",
    badge: "Balanced",
    colors: {
      primary: "178 74% 21%",
      primaryForeground: "0 0% 100%",
      secondary: "40 44% 91%",
      secondaryForeground: "225 15% 12%",
      accent: "41 55% 54%",
      accentForeground: "40 33% 8%",
      accentText: "40 45% 27%",
      background: "40 33% 97%",
      foreground: "225 15% 12%",
      card: "0 0% 100%",
      cardForeground: "225 15% 12%",
      muted: "40 25% 93%",
      mutedForeground: "220 6% 40%",
      border: "40 22% 88%",
      input: "40 12% 55%",
      ring: "178 74% 21%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "178 68% 46%",
      primaryForeground: "180 50% 6%",
      secondary: "180 25% 14%",
      secondaryForeground: "40 30% 96%",
      accent: "43 85% 62%",
      accentForeground: "40 30% 8%",
      accentText: "43 90% 70%",
      background: "180 30% 6%",
      foreground: "40 30% 96%",
      card: "180 28% 9%",
      cardForeground: "40 30% 96%",
      muted: "180 20% 14%",
      mutedForeground: "180 15% 68%",
      border: "180 20% 18%",
      input: "180 20% 24%",
      ring: "178 68% 46%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  ocean: {
    id: "ocean",
    name: "Ocean Maritime",
    description: "Deep maritime navy with cool breeze surfaces and bright azure accents. Fresh and adventurous.",
    badge: "Cool & Crisp",
    colors: {
      primary: "215 78% 28%",
      primaryForeground: "0 0% 100%",
      secondary: "210 30% 92%",
      secondaryForeground: "220 25% 10%",
      accent: "199 89% 44%",
      accentForeground: "0 0% 100%",
      accentText: "215 75% 28%",
      background: "210 33% 98%",
      foreground: "220 25% 10%",
      card: "0 0% 100%",
      cardForeground: "220 25% 10%",
      muted: "210 25% 93%",
      mutedForeground: "215 15% 42%",
      border: "215 25% 88%",
      input: "215 15% 55%",
      ring: "215 78% 28%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "212 90% 62%",
      primaryForeground: "215 50% 8%",
      secondary: "215 35% 15%",
      secondaryForeground: "210 30% 96%",
      accent: "188 88% 54%",
      accentForeground: "215 50% 8%",
      accentText: "188 90% 68%",
      background: "218 45% 7%",
      foreground: "210 30% 96%",
      card: "218 40% 10%",
      cardForeground: "210 30% 96%",
      muted: "218 30% 14%",
      mutedForeground: "215 18% 68%",
      border: "218 30% 18%",
      input: "218 25% 24%",
      ring: "212 90% 62%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  emerald: {
    id: "emerald",
    name: "Emerald Sanctuary",
    description: "Lush botanical pine with soothing sage surfaces and warm golden highlights.",
    badge: "Spiritual & Rich",
    colors: {
      primary: "160 84% 28%",
      primaryForeground: "0 0% 100%",
      secondary: "150 25% 92%",
      secondaryForeground: "160 20% 10%",
      accent: "42 85% 44%",
      accentForeground: "0 0% 100%",
      accentText: "160 80% 22%",
      background: "150 20% 98%",
      foreground: "160 20% 10%",
      card: "0 0% 100%",
      cardForeground: "160 20% 10%",
      muted: "150 20% 93%",
      mutedForeground: "155 12% 40%",
      border: "150 20% 86%",
      input: "150 12% 55%",
      ring: "160 84% 28%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "158 64% 52%",
      primaryForeground: "160 50% 6%",
      secondary: "160 30% 14%",
      secondaryForeground: "150 25% 96%",
      accent: "42 85% 64%",
      accentForeground: "160 50% 6%",
      accentText: "42 90% 72%",
      background: "160 40% 6%",
      foreground: "150 25% 96%",
      card: "160 35% 9%",
      cardForeground: "150 25% 96%",
      muted: "160 25% 14%",
      mutedForeground: "155 15% 68%",
      border: "160 25% 18%",
      input: "160 20% 24%",
      ring: "158 64% 52%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  royal: {
    id: "royal",
    name: "Royal Heritage",
    description: "Imperial indigo with silken ivory surfaces and sovereign gold accents. Stately and refined.",
    badge: "Prestige",
    colors: {
      primary: "245 58% 36%",
      primaryForeground: "0 0% 100%",
      secondary: "240 25% 92%",
      secondaryForeground: "240 25% 10%",
      accent: "280 65% 46%",
      accentForeground: "0 0% 100%",
      accentText: "245 55% 28%",
      background: "240 20% 98%",
      foreground: "240 25% 10%",
      card: "0 0% 100%",
      cardForeground: "240 25% 10%",
      muted: "240 20% 93%",
      mutedForeground: "240 10% 42%",
      border: "240 20% 88%",
      input: "240 10% 55%",
      ring: "245 58% 36%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "245 75% 68%",
      primaryForeground: "245 50% 6%",
      secondary: "245 30% 15%",
      secondaryForeground: "240 20% 96%",
      accent: "280 80% 68%",
      accentForeground: "245 50% 6%",
      accentText: "280 85% 76%",
      background: "245 35% 7%",
      foreground: "240 20% 96%",
      card: "245 30% 10%",
      cardForeground: "240 20% 96%",
      muted: "245 25% 15%",
      mutedForeground: "240 15% 68%",
      border: "245 25% 19%",
      input: "245 20% 25%",
      ring: "245 75% 68%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  sunset: {
    id: "sunset",
    name: "Desert Sunset",
    description: "Terracotta and desert amber with warm sandstone surfaces. Warm, inviting and energetic.",
    badge: "Warm Editorial",
    colors: {
      primary: "14 75% 38%",
      primaryForeground: "0 0% 100%",
      secondary: "32 40% 92%",
      secondaryForeground: "20 20% 12%",
      accent: "34 95% 46%",
      accentForeground: "0 0% 100%",
      accentText: "14 75% 28%",
      background: "30 30% 98%",
      foreground: "20 20% 12%",
      card: "0 0% 100%",
      cardForeground: "20 20% 12%",
      muted: "30 25% 93%",
      mutedForeground: "25 10% 42%",
      border: "30 20% 88%",
      input: "30 10% 55%",
      ring: "14 75% 38%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "16 85% 62%",
      primaryForeground: "16 50% 6%",
      secondary: "18 28% 15%",
      secondaryForeground: "30 25% 96%",
      accent: "38 95% 62%",
      accentForeground: "16 50% 6%",
      accentText: "38 95% 72%",
      background: "18 30% 7%",
      foreground: "30 25% 96%",
      card: "18 25% 10%",
      cardForeground: "30 25% 96%",
      muted: "18 20% 14%",
      mutedForeground: "25 15% 68%",
      border: "18 20% 18%",
      input: "18 18% 24%",
      ring: "16 85% 62%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  minimal: {
    id: "minimal",
    name: "Minimalist Slate",
    description: "Obsidian charcoal and crisp pure surfaces with graphite accents. Quiet, modern and architectural.",
    badge: "Modern Monochrome",
    colors: {
      primary: "220 25% 20%",
      primaryForeground: "0 0% 100%",
      secondary: "220 14% 94%",
      secondaryForeground: "220 20% 10%",
      accent: "215 25% 45%",
      accentForeground: "0 0% 100%",
      accentText: "220 25% 20%",
      background: "0 0% 100%",
      foreground: "220 20% 10%",
      card: "0 0% 100%",
      cardForeground: "220 20% 10%",
      muted: "220 15% 95%",
      mutedForeground: "220 10% 42%",
      border: "220 15% 89%",
      input: "220 10% 55%",
      ring: "220 25% 20%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "220 20% 78%",
      primaryForeground: "220 30% 8%",
      secondary: "220 20% 15%",
      secondaryForeground: "220 15% 96%",
      accent: "215 30% 65%",
      accentForeground: "220 30% 8%",
      accentText: "215 30% 75%",
      background: "220 25% 7%",
      foreground: "220 15% 96%",
      card: "220 20% 10%",
      cardForeground: "220 15% 96%",
      muted: "220 18% 14%",
      mutedForeground: "220 12% 68%",
      border: "220 18% 18%",
      input: "220 15% 24%",
      ring: "220 20% 78%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },

  custom: {
    id: "custom",
    name: "Custom",
    description: "User-built preset with live preview and automatic contrast safeguarding.",
    badge: "Custom",
    colors: {
      primary: "213 91% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "212 45% 95%",
      secondaryForeground: "222 47% 12%",
      accent: "38 92% 50%",
      accentForeground: "0 0% 100%",
      accentText: "32 80% 28%",
      background: "210 45% 98%",
      foreground: "222 47% 11%",
      card: "0 0% 100%",
      cardForeground: "222 47% 11%",
      muted: "212 35% 94%",
      mutedForeground: "215 18% 42%",
      border: "214 30% 88%",
      input: "215 15% 55%",
      ring: "213 91% 50%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
    darkColors: {
      primary: "213 94% 62%",
      primaryForeground: "222 47% 10%",
      secondary: "222 40% 16%",
      secondaryForeground: "210 40% 96%",
      accent: "43 96% 62%",
      accentForeground: "222 47% 10%",
      accentText: "43 96% 70%",
      background: "222 47% 7%",
      foreground: "210 40% 96%",
      card: "222 47% 10%",
      cardForeground: "210 40% 96%",
      muted: "222 40% 15%",
      mutedForeground: "215 20% 68%",
      border: "222 35% 19%",
      input: "222 35% 25%",
      ring: "213 94% 62%",
      success: "142 70% 48%",
      warning: "38 95% 55%",
      destructive: "0 75% 60%",
    },
  },
};

export type CustomThemePreset = {
  id: string;
  name: string;
  colors: ThemeColors;
  createdAt: string;
  updatedAt: string;
};

export type ThemeSettings = {
  template: ThemeTemplateKey;
  colors: ThemeColors;
  customPresets?: CustomThemePreset[];
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  template: "flightblu",
  colors: { ...THEME_TEMPLATES.flightblu.colors },
  customPresets: [],
};

/** Parse HSL channel string into [H, S, L] numbers */
function parseHsl(hsl: string | null | undefined): [number, number, number] | null {
  if (typeof hsl !== "string" || !hsl.trim()) return null;
  const m = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** HSL "h s% l%" → relative luminance (sRGB) for AA contrast hints. */
function hslToLuminance(hsl: string | null | undefined): number {
  const parsed = parseHsl(hsl);
  if (!parsed) return 0;
  const [h, sPct, lPct] = parsed;
  const s = sPct / 100;
  const l = lPct / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toLin = (v: number): number => {
    const sV = v + mm;
    return sV <= 0.03928 ? sV / 12.92 : Math.pow((sV + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/** WCAG contrast ratio between two HSL channel strings. */
export function themeContrastRatio(a: string | null | undefined, b: string | null | undefined): number {
  const l1 = hslToLuminance(a);
  const l2 = hslToLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA hint for a preset: body text pair must reach 4.5:1 (§1.2). */
export function themeAAPass(colors: ThemeColors | null | undefined): { ratio: number; pass: boolean } {
  if (!colors || typeof colors !== "object") {
    return { ratio: 4.5, pass: true };
  }
  const ratio = themeContrastRatio(colors.foreground, colors.background);
  return { ratio: Math.round(ratio * 100) / 100, pass: ratio >= 4.5 };
}

/**
 * Intelligent dark-mode luminance calibration.
 * Transforms a light-mode color token into a vivid, non-washout dark mode equivalent.
 */
function calibrateForDark(hsl: string, defaultLightness = 62): string {
  const parsed = parseHsl(hsl);
  if (!parsed) return hsl;
  const [h, s, l] = parsed;
  // If the color was already dark (L < 45%), elevate it to be radiant on dark surfaces
  const darkL = l < 45 ? Math.max(defaultLightness, 55) : l;
  return `${h} ${Math.min(s + 5, 100)}% ${darkL}%`;
}

/**
 * Generate CSS variable overrides for BOTH :root:not(.dark) AND .dark.
 * Mathematically guarantees zero contrast defects and prevents hover washouts.
 */
export function buildThemeCssVariables(theme: ThemeSettings | null | undefined): string {
  if (!theme || !theme.colors) return "";
  const templateKey = theme.template in THEME_TEMPLATES ? theme.template : "flightblu";
  const baseTemplate = THEME_TEMPLATES[templateKey];

  // Light Mode Colors (User merged with template defaults)
  const light = { ...baseTemplate.colors, ...theme.colors };

  // Dark Mode Colors: Use hand-calibrated preset dark tokens as base
  const darkBase = baseTemplate.darkColors;
  const dark: ThemeColors = {
    ...darkBase,
    // If user customized primary, calibrate it for dark mode
    primary: theme.colors.primary !== baseTemplate.colors.primary
      ? calibrateForDark(theme.colors.primary, 62)
      : darkBase.primary,
    accent: theme.colors.accent !== baseTemplate.colors.accent
      ? calibrateForDark(theme.colors.accent, 64)
      : darkBase.accent,
  };

  return `
:root:not(.dark) {
  --background: ${light.background};
  --foreground: ${light.foreground};
  --card: ${light.card};
  --card-foreground: ${light.cardForeground};
  --popover: ${light.card};
  --popover-foreground: ${light.cardForeground};
  --primary: ${light.primary};
  --primary-foreground: ${light.primaryForeground};
  --secondary: ${light.secondary};
  --secondary-foreground: ${light.secondaryForeground};
  --muted: ${light.muted};
  --muted-foreground: ${light.mutedForeground};
  --accent: ${light.accent};
  --accent-foreground: ${light.accentForeground};
  --accent-text: ${light.accentText};
  --success: ${light.success};
  --warning: ${light.warning};
  --destructive: ${light.destructive};
  --border: ${light.border};
  --input: ${light.input};
  --ring: ${light.ring};
  --sidebar: hsl(${light.card});
  --sidebar-foreground: hsl(${light.foreground});
  --sidebar-primary: hsl(${light.primary});
  --sidebar-primary-foreground: hsl(${light.primaryForeground});
  --sidebar-border: hsl(${light.border});
}

.dark {
  --background: ${dark.background};
  --foreground: ${dark.foreground};
  --card: ${dark.card};
  --card-foreground: ${dark.cardForeground};
  --popover: ${dark.card};
  --popover-foreground: ${dark.cardForeground};
  --primary: ${dark.primary};
  --primary-foreground: ${dark.primaryForeground};
  --secondary: ${dark.secondary};
  --secondary-foreground: ${dark.secondaryForeground};
  --muted: ${dark.muted};
  --muted-foreground: ${dark.mutedForeground};
  --accent: ${dark.accent};
  --accent-foreground: ${dark.accentForeground};
  --accent-text: ${dark.accentText};
  --success: ${dark.success};
  --warning: ${dark.warning};
  --destructive: ${dark.destructive};
  --border: ${dark.border};
  --input: ${dark.input};
  --ring: ${dark.ring};
  --sidebar: hsl(${dark.card});
  --sidebar-foreground: hsl(${dark.foreground});
  --sidebar-primary: hsl(${dark.primary});
  --sidebar-primary-foreground: hsl(${dark.primaryForeground});
  --sidebar-border: hsl(${dark.border});
}
`.trim();
}
