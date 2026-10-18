export type ThemeColors = {
  primary: string; // HSL channels, e.g. "178 74% 21%"
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
};

export const THEME_TEMPLATES: Record<ThemeTemplateKey, ThemeTemplate> = {
  signature: {    id: "signature",
    name: "TripMate Signature",
    description: "Deep teal with warm sand surfaces and gold spiritual highlights. Balanced and trustworthy.",
    badge: "Default",
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
  },
  ocean: {
    id: "ocean",
    name: "Ocean Maritime",
    description: "Deep maritime navy with cool breeze surfaces and bright azure accents. Fresh and adventurous.",
    badge: "Cool & Crisp",
    colors: {
      primary: "215 78% 25%",
      primaryForeground: "0 0% 100%",
      secondary: "210 30% 92%",
      secondaryForeground: "220 25% 10%",
      accent: "199 89% 48%",
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
      ring: "215 78% 25%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
  },
  emerald: {
    id: "emerald",
    name: "Emerald Sanctuary",
    description: "Lush botanical pine with soothing sage surfaces and warm golden highlights.",
    badge: "Spiritual & Rich",
    colors: {
      primary: "158 64% 22%",
      primaryForeground: "0 0% 100%",
      secondary: "150 25% 92%",
      secondaryForeground: "160 20% 10%",
      accent: "45 80% 50%",
      accentForeground: "40 33% 8%",
      accentText: "45 75% 28%",
      background: "140 20% 98%",
      foreground: "160 20% 10%",
      card: "0 0% 100%",
      cardForeground: "160 20% 10%",
      muted: "150 20% 93%",
      mutedForeground: "155 12% 40%",
      border: "150 20% 86%",
      input: "150 12% 55%",
      ring: "158 64% 22%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
  },
  royal: {
    id: "royal",
    name: "Royal Heritage",
    description: "Imperial indigo with silken ivory surfaces and sovereign gold accents. Stately and refined.",
    badge: "Prestige",
    colors: {
      primary: "240 55% 24%",
      primaryForeground: "0 0% 100%",
      secondary: "240 25% 92%",
      secondaryForeground: "240 25% 10%",
      accent: "38 75% 52%",
      accentForeground: "40 33% 8%",
      accentText: "38 70% 28%",
      background: "240 20% 98%",
      foreground: "240 25% 10%",
      card: "0 0% 100%",
      cardForeground: "240 25% 10%",
      muted: "240 20% 93%",
      mutedForeground: "240 10% 42%",
      border: "240 20% 88%",
      input: "240 10% 55%",
      ring: "240 55% 24%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
  },
  sunset: {
    id: "sunset",
    name: "Desert Sunset",
    description: "Terracotta and desert amber with warm sandstone surfaces. Warm, inviting and energetic.",
    badge: "Warm Editorial",
    colors: {
      primary: "14 65% 36%",
      primaryForeground: "0 0% 100%",
      secondary: "32 40% 92%",
      secondaryForeground: "20 20% 12%",
      accent: "35 85% 55%",
      accentForeground: "40 33% 8%",
      accentText: "25 75% 28%",
      background: "30 30% 98%",
      foreground: "20 20% 12%",
      card: "0 0% 100%",
      cardForeground: "20 20% 12%",
      muted: "30 25% 93%",
      mutedForeground: "25 10% 42%",
      border: "30 20% 88%",
      input: "30 10% 55%",
      ring: "14 65% 36%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
  },
  minimal: {
    id: "minimal",
    name: "Minimalist Slate",
    description: "Obsidian charcoal and crisp pure surfaces with graphite accents. Quiet, modern and architectural.",
    badge: "Modern Monochrome",
    colors: {
      primary: "220 16% 14%",
      primaryForeground: "0 0% 100%",
      secondary: "220 14% 94%",
      secondaryForeground: "220 20% 10%",
      accent: "215 25% 45%",
      accentForeground: "0 0% 100%",
      accentText: "220 16% 20%",
      background: "0 0% 100%",
      foreground: "220 20% 10%",
      card: "0 0% 100%",
      cardForeground: "220 20% 10%",
      muted: "220 15% 95%",
      mutedForeground: "220 10% 42%",
      border: "220 15% 89%",
      input: "220 10% 55%",
      ring: "220 16% 14%",
      success: "142 72% 29%",
      warning: "32 95% 38%",
      destructive: "2 70% 41%",
    },
  },
  flightblu: {
    id: "flightblu",
    name: "Flight Blu",
    description: "Brand azure with sun-gold highlights and cool sky-tinted neutrals. Built for the FlightBlu logo.",
    badge: "Brand",
    colors: {
      primary: "213 91% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "212 45% 95%",
      secondaryForeground: "222 47% 12%",
      accent: "38 92% 50%",
      accentForeground: "33 27% 9%",
      accentText: "32 75% 30%",
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
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "User-built preset. Per-token colors with live preview before save.",
    badge: "Custom",
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
  template: "signature",
  colors: { ...THEME_TEMPLATES.signature.colors },
  customPresets: [],
};

/** HSL "h s% l%" → relative luminance (sRGB) for AA contrast hints. */
/** HSL "h s% l%" → relative luminance (sRGB) for AA contrast hints. */
function hslToLuminance(hsl: string | null | undefined): number {
  if (typeof hsl !== "string" || !hsl.trim()) return 0;
  const m = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return 0;
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
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
 * Generate CSS variable overrides for the LIGHT theme (:root:not(.dark)).
 * Scoping to light-only keeps the built-in .dark token set (globals.css)
 * intact — an unscoped :root override injected after globals would beat the
 * .dark rules in the cascade and break dark mode.
 */
export function buildThemeCssVariables(theme: ThemeSettings | null | undefined): string {
  if (!theme || !theme.colors) return "";
  const def = THEME_TEMPLATES.signature.colors;
  const c = { ...def, ...theme.colors };
  return `
:root:not(.dark) {
  --background: ${c.background || def.background};
  --foreground: ${c.foreground || def.foreground};
  --card: ${c.card || def.card};
  --card-foreground: ${c.cardForeground || def.cardForeground};
  --popover: ${c.card || def.card};
  --popover-foreground: ${c.cardForeground || def.cardForeground};
  --primary: ${c.primary || def.primary};
  --primary-foreground: ${c.primaryForeground || def.primaryForeground};
  --secondary: ${c.secondary || def.secondary};
  --secondary-foreground: ${c.secondaryForeground || def.secondaryForeground};
  --muted: ${c.muted || def.muted};
  --muted-foreground: ${c.mutedForeground || def.mutedForeground};
  --accent: ${c.accent || def.accent};
  --accent-foreground: ${c.accentForeground || def.accentForeground};
  --accent-text: ${c.accentText || def.accentText};
  --success: ${c.success || def.success};
  --warning: ${c.warning || def.warning};
  --destructive: ${c.destructive || def.destructive};
  --border: ${c.border || def.border};
  --input: ${c.input || def.input};
  --ring: ${c.ring || def.ring};
  --sidebar: hsl(${c.card || def.card});
  --sidebar-foreground: hsl(${c.foreground || def.foreground});
  --sidebar-primary: hsl(${c.primary || def.primary});
  --sidebar-primary-foreground: hsl(${c.primaryForeground || def.primaryForeground});
  --sidebar-border: hsl(${c.border || def.border});
}
`.trim();
}
