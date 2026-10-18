import { describe, expect, it } from "vitest";
import {
  THEME_TEMPLATES,
  themeAAPass,
  themeContrastRatio,
  type ThemeColors,
} from "@/modules/settings/theme";

const TOKEN_KEYS: (keyof ThemeColors)[] = [
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "accentText",
  "background",
  "foreground",
  "card",
  "cardForeground",
  "muted",
  "mutedForeground",
  "border",
  "input",
  "ring",
  "success",
  "warning",
  "destructive",
];

const HSL_PATTERN = /^\d{1,3} \d{1,3}% \d{1,3}(\.\d+)?%$/;

describe("theme templates", () => {
  it("every template defines all semantic tokens as HSL channel strings", () => {
    for (const [key, template] of Object.entries(THEME_TEMPLATES)) {
      expect(template.name.length, key).toBeGreaterThan(0);
      expect(template.badge.length, key).toBeGreaterThan(0);
      for (const token of TOKEN_KEYS) {
        expect(template.colors[token], `${key}.${token}`).toMatch(HSL_PATTERN);
      }
    }
  });

  it("every template passes the AA hint (foreground on background ≥ 4.5:1)", () => {
    for (const [key, template] of Object.entries(THEME_TEMPLATES)) {
      const aa = themeAAPass(template.colors);
      expect(aa.pass, `${key} scored ${aa.ratio}:1`).toBe(true);
    }
  });

  it("registers the Flight Blu brand preset with the logo-derived palette", () => {
    const template = THEME_TEMPLATES.flightblu;
    expect(template).toBeDefined();
    expect(template.name).toBe("Flight Blu");
    expect(template.colors.primary).toBe("213 91% 46%");
    expect(template.colors.ring).toBe("213 91% 50%");
    expect(template.colors.accent).toBe("38 92% 50%");
    expect(template.colors.background).toBe("210 45% 98%");
  });

  it("Flight Blu passes every critical contrast pair", () => {
    const c = THEME_TEMPLATES.flightblu.colors;
    expect(themeContrastRatio(c.primaryForeground, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.secondaryForeground, c.secondary)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.accentForeground, c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.accentText, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.mutedForeground, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.foreground, c.card)).toBeGreaterThanOrEqual(4.5);
    expect(themeContrastRatio(c.ring, c.background)).toBeGreaterThanOrEqual(3);
  });
});
