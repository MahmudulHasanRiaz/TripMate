import type { Viewport } from "next";

/**
 * Browser-chrome theme colors for `<meta name="theme-color">`, matching the
 * app's light/dark `--background` design tokens (src/app/globals.css).
 *
 * These are sanctioned raw-hex literals that must live OUTSIDE src/:
 * `<meta name="theme-color">` content is parsed by browsers as a standalone CSS
 * `<color>`, so it cannot reference CSS custom properties — the design tokens
 * are unrepresentable here. Keeping the literals outside src/ lets the
 * no-restricted-syntax hex gate in eslint.config.mjs (scoped to src/**) stay
 * strict for UI code, while the email templates and this browser-chrome
 * constant are the only places real hex appears.
 */
export const themeColor: Viewport["themeColor"] = [
  { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
  { media: "(prefers-color-scheme: dark)", color: "#0C0F14" },
];
