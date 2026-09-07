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
  | "minimal";

export type ThemeTemplate = {
  id: ThemeTemplateKey;
  name: string;
  description: string;
  badge: string;
  colors: ThemeColors;
};

export const THEME_TEMPLATES: Record<ThemeTemplateKey, ThemeTemplate> = {
  signature: {
    id: "signature",
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
};

export type ThemeSettings = {
  template: ThemeTemplateKey;
  colors: ThemeColors;
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  template: "signature",
  colors: { ...THEME_TEMPLATES.signature.colors },
};

/**
 * Generate CSS variable overrides for :root from the configured theme colors.
 * This injects into a <style> tag so any admin change immediately restyles
 * all Tailwind utility classes using semantic tokens.
 */
export function buildThemeCssVariables(theme: ThemeSettings): string {
  const c = theme.colors;
  return `
:root {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --card: ${c.card};
  --card-foreground: ${c.cardForeground};
  --popover: ${c.card};
  --popover-foreground: ${c.cardForeground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --secondary: ${c.secondary};
  --secondary-foreground: ${c.secondaryForeground};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --accent: ${c.accent};
  --accent-foreground: ${c.accentForeground};
  --accent-text: ${c.accentText};
  --success: ${c.success};
  --warning: ${c.warning};
  --destructive: ${c.destructive};
  --border: ${c.border};
  --input: ${c.input};
  --ring: ${c.ring};
  --sidebar: hsl(${c.card});
  --sidebar-foreground: hsl(${c.foreground});
  --sidebar-primary: hsl(${c.primary});
  --sidebar-primary-foreground: hsl(${c.primaryForeground});
  --sidebar-border: hsl(${c.border});
}
`.trim();
}
