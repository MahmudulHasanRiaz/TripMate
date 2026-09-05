import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react/no-danger": "error",
    },
  },
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
    ignores: [
      // Default ignores of eslint-config-next:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Project-level ignores:
      "node_modules/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;
