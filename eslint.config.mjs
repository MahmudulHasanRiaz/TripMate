import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/db/**", "scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/db/connection"], message: "Import @/db/client instead — connection.ts is for scripts only and must never enter app (especially client) code." }] },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/modules/email/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message: "Raw hex color — use design tokens (bg-primary, text-muted-foreground, ...). UI spec §2.1.",
        },
      ],
    },
  },
  {
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Project-level ignores:
      ".claude/**",
      ".commandcode/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
