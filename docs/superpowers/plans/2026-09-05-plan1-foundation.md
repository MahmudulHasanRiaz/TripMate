# TripMate v2 — Plan 1: Foundation (Phases 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Firebase-era TripMate repo into a clean Next.js 16 foundation: dead code stripped, stack upgraded, Tailwind v4 design tokens live, Drizzle+PostgreSQL with the complete v2 schema + seed, env validation, test harness, and a placeholder app shell — all with hard lint/type gates.

**Architecture:** In-place modernization. Old Firebase data layer and client-fetch pages are deleted (they are rebuilt in later plans). shadcn/ui primitives and `lib/utils.ts` survive. Full module-based folder structure is created per the spec. Database = PostgreSQL via Drizzle (postgres.js driver), migrations in git.

**Tech Stack:** Next.js ≥16.3 (Turbopack, typed routes), React 19.2, TypeScript strict, Tailwind CSS v4 (`@theme`), Drizzle ORM + drizzle-kit, postgres.js, Zod, Vitest, Playwright, Docker Compose (local Postgres).

**Spec:** `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md` (architecture) + `docs/superpowers/specs/2026-09-05-ui-design-system.md` (tokens §2). Read both before starting.

**Plan series:** This is plan 1 of 7. Later plans (written when reached): 2-Auth & Admin Shell **+ Setup Wizard + email foundation (SMTP transport + send util; Plans 4-5 consume it, no-op fallback when SMTP unset)**, 3-Content/Catalog/Public Site **+ sitemap.ts/robots.ts + skip-link + View Transitions + seeded static pages (about/faq/terms/privacy as `pages` rows via `p/[slug]`)**, 4-Leads/LP Builder/Meta CAPI **+ CAPI event status log view**, 5-Orders/Payments/Expenses/Portal, 6-Email templates/Notification flows/Dashboard, 7-CI/Docker/Polish **+ `npm run setup` + Upstash rate-limit switch + password policy docs**. Plan 2 also owns `withGuard` (permission + rate-limit wrapper, with lint rule) and Better Auth password min-length config.

## Global Constraints

- TypeScript `strict: true`; `ignoreBuildErrors` and `ignoreDuringBuilds` NEVER reappear in any config.
- All DB access server-only, fenced via `server-only` package where imported by server modules.
- Env validated with Zod at boot (`src/lib/env.ts`); `.env.example` always complete.
- Tables snake_case, `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`. Soft-delete `deleted_at` only on content/media/landing_pages.
- No `dangerouslySetInnerHTML` anywhere. No raw SQL strings. No client component importing `db/` or `modules/*/schema.ts`.
- Tailwind v4 only — no `tailwind.config.ts`. Colors only via semantic tokens (CSS vars bridged in `@theme`).
- Commits after every task. Commit style: Conventional Commits.
- Commands run from repo root. Node ≥ 20.9. Package manager: npm.

---

### Task 1: Strip the Firebase era (dead code + deps)

**Files:**
- Delete: `src/api/` (whole dir), `src/next.config.ts`, `.modified`, `docs/blueprint.md`, `firestore.rules`, `src/ai/` (whole), `src/middleware.ts`
- Delete: `src/app/admin/`, `src/app/setup/`, `src/app/login/`, `src/app/signup/`, `src/app/dashboard/`, `src/app/blog/`, `src/app/about-us/`, `src/app/faq/`, `src/app/privacy-policy/`, `src/app/terms-of-service/`, `src/app/packages/`, `src/app/[slug]/`, `src/app/api/`
- Delete: `src/components/admin/`, `src/components/chatbot/`, `src/components/layout/`, `src/components/BookingForm.tsx`, `src/components/ContactForm.tsx`, `src/components/PackageCard.tsx`
- Delete: `src/context/`, `src/hooks/use-auth.tsx`, `src/lib/actions.ts`, `src/lib/data.ts`, `src/lib/firebase.ts`, `src/lib/firebase-admin.ts`
- Delete: `src/components/ui/chart.tsx`, `src/components/ui/carousel.tsx`, `src/components/ui/sidebar.tsx`, `src/components/ui/menubar.tsx`, `src/components/ui/calendar.tsx` (recharts/embla/react-day-picker v8 are removed; v8's peer range caps React at 18 and would abort the React 19 install in Task 2 — re-add all from shadcn when later plans need them)
- Rewrite: `src/app/page.tsx` (placeholder), `src/app/layout.tsx` (minimal)
- Modify: `package.json` (remove deps)

**Interfaces:**
- Consumes: nothing.
- Produces: minimal app that builds. `components/ui/*` (minus removed) + `components/icons/Logo.tsx` + `hooks/use-toast.ts` + `hooks/use-mobile.tsx` + `lib/utils.ts` + `public/` survive for later plans.

- [ ] **Step 1: Delete all listed files/dirs**

```bash
git rm -r src/api src/next.config.ts .modified docs/blueprint.md firestore.rules src/ai src/middleware.ts src/app/admin src/app/setup src/app/login src/app/signup src/app/dashboard src/app/blog src/app/about-us src/app/faq src/app/privacy-policy src/app/terms-of-service src/app/packages "src/app/[slug]" src/app/api src/components/admin src/components/chatbot src/components/layout src/components/BookingForm.tsx src/components/ContactForm.tsx src/components/PackageCard.tsx src/context src/hooks/use-auth.tsx src/lib/actions.ts src/lib/data.ts src/lib/firebase.ts src/lib/firebase-admin.ts src/components/ui/chart.tsx src/components/ui/carousel.tsx src/components/ui/sidebar.tsx src/components/ui/menubar.tsx
```

- [ ] **Step 2: Rewrite `src/app/layout.tsx` minimal**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TripMate",
  description: "Tours, Hajj & Umrah packages, flights and visa services.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/page.tsx` placeholder**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">TripMate v2 — Foundation</h1>
    </main>
  );
}
```

- [ ] **Step 4: Remove dead deps from `package.json`**

```bash
npm uninstall firebase firebase-admin genkit @genkit-ai/googleai @genkit-ai/next genkit-cli dotenv @aws-sdk/client-s3 @aws-sdk/s3-request-presigner recharts react-image-crop embla-carousel-react embla-carousel-autoplay tailwindcss-animate react-day-picker date-fns
```

- [ ] **Step 5: Rewrite root `next.config.ts` clean (kill the ignore flags NOW)**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
```
The old config had `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` — removing them here makes the Task 1 build an honest gate. (Task 2 adds `typedRoutes`.)

- [ ] **Step 6: Verify build + commit**

```bash
npm run build
```
Expected: build succeeds (Next 15 still here). If TS errors from leftover imports, grep for `@/lib/data`, `@/lib/firebase`, `@/hooks/use-auth`, `next/head` and delete remaining importers, then rebuild.

```bash
git add -A && git commit -m "chore: remove Firebase-era code, deps and dead files"
```

---

### Task 2: Upgrade to Next.js 16 + React 19.2 + ESLint flat config

**Files:**
- Modify: `package.json`, `next.config.ts` (root), `tsconfig.json`, `postcss.config.mjs` (unchanged this task), `eslint.config.mjs` (create), `.gitignore` (add `.env*` exceptions)
- Create: `.env.example` (initial)

**Interfaces:**
- Produces: Next 16 app; scripts `dev`, `build`, `start`, `lint` (eslint CLI), `typecheck` all green. `next.config.ts` with `typedRoutes: true`.

- [ ] **Step 1: Upgrade framework deps**

```bash
npm install next@latest react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest typescript@latest
```
If `npm install next@latest` resolves < 16.3, use `next@canary` or the newest 16.x tag available. Verify with `npx next --version`.

- [ ] **Step 2: Rewrite root `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
    ],
  },
};

export default nextConfig;
```
Note: hardcoded R2 host is gone; the storage module (later plan) injects its host via env at runtime.

- [ ] **Step 3: Update `package.json` scripts (remove `-p 9002` and genkit scripts, add lint via ESLint CLI)**

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 4: Create `eslint.config.mjs` (flat config — `next lint` is removed in Next 16)**

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/no-danger": "error",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "out/**", "playwright-report/**"],
  },
];
```

```bash
npm install -D eslint@^9 @eslint/eslintrc eslint-config-next
```

- [ ] **Step 5: Create `.env.example` (initial; grows in later tasks/plans)**

```bash
# --- Core (required) ---
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripmate
APP_URL=http://localhost:3000
```

- [ ] **Step 6: Ensure `.gitignore` keeps env files ignored but `.env.example` tracked**

`.gitignore` must contain:
```
.env*
!.env.example
```

- [ ] **Step 7: Verify gates + commit**

```bash
npm run lint && npm run typecheck && npm run build
```
Expected: all green. Fix any React 19 / Next 16 breaking changes surfaced (e.g. `params` is now a Promise — no pages left that use it, so minimal).

```bash
git add -A && git commit -m "feat: upgrade to Next.js 16 + React 19.2, ESLint flat config, typed routes"
```

---

### Task 3: Tailwind v4 + design token system

**Files:**
- Modify: `package.json`, `postcss.config.mjs`, `src/app/globals.css` (full rewrite)
- Delete: `tailwind.config.ts`

**Interfaces:**
- Produces: semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-accent`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-card`, `text-destructive`, `rounded-lg/md/sm`, `font-display`, `font-body`, `shadow-sm`, `shadow-lg`, `.dark` theme) working on Tailwind v4. Existing shadcn `components/ui/*` compile unchanged (they use semantic classes, not `hsl(var())` inline).

- [ ] **Step 1: Swap Tailwind deps to v4**

```bash
npm uninstall tailwindcss postcss
npm install -D tailwindcss@^4 @tailwindcss/postcss@^4 postcss tw-animate-css
```

- [ ] **Step 2: Rewrite `postcss.config.mjs`**

```js
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

- [ ] **Step 3: Rewrite `src/app/globals.css` — tokens per UI spec §2 (baseline values; HSL triplet vars bridged into `@theme` so old shadcn classes keep working)**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: 40 33% 97%;
  --foreground: 225 15% 12%;
  --card: 0 0% 100%;
  --card-foreground: 225 15% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 225 15% 12%;
  --primary: 178 74% 21%;
  --primary-foreground: 0 0% 100%;
  --secondary: 40 44% 91%;
  --secondary-foreground: 225 15% 12%;
  --muted: 40 25% 93%;
  --muted-foreground: 220 6% 40%;
  --accent: 41 55% 54%;
  --accent-foreground: 40 33% 8%;
  --accent-text: 40 45% 27%;
  --success: 142 72% 29%;
  --success-foreground: 0 0% 100%;
  --warning: 32 95% 38%;
  --warning-foreground: 0 0% 100%;
  --info: 217 91% 55%;
  --info-foreground: 0 0% 100%;
  --destructive: 2 70% 41%;
  --destructive-foreground: 0 0% 100%;
  --border: 40 22% 88%;
  --input: 40 12% 55%;
  --ring: 178 74% 21%;
  --radius: 0.75rem;
}

.dark {
  --background: 220 23% 6%;
  --foreground: 225 20% 94%;
  --card: 218 24% 9%;
  --card-foreground: 225 20% 94%;
  --popover: 218 24% 9%;
  --popover-foreground: 225 20% 94%;
  --primary: 176 59% 41%;
  --primary-foreground: 172 68% 8%;
  --secondary: 218 20% 13%;
  --secondary-foreground: 225 20% 94%;
  --muted: 219 21% 11%;
  --muted-foreground: 220 9% 64%;
  --accent: 42 68% 65%;
  --accent-foreground: 40 33% 8%;
  --accent-text: 42 68% 65%;
  --success: 142 65% 50%;
  --success-foreground: 160 84% 8%;
  --warning: 38 92% 55%;
  --warning-foreground: 40 33% 8%;
  --info: 213 94% 67%;
  --info-foreground: 220 25% 10%;
  --destructive: 4 74% 83%;
  --destructive-foreground: 2 70% 20%;
  --border: 219 20% 17%;
  --input: 219 14% 45%;
  --ring: 176 59% 41%;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-accent-text: hsl(var(--accent-text));
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
  --color-info: hsl(var(--info));
  --color-info-foreground: hsl(var(--info-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 4px);
  --radius-sm: calc(var(--radius) - 8px);

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 30px -10px rgb(0 0 0 / 0.15);

  --font-display: var(--font-fraunces), Georgia, serif;
  --font-body: var(--font-inter), system-ui, "Noto Sans Bengali", "Hind Siliguri", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-body antialiased;
  }
  :focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
(`--font-fraunces`/`--font-inter` CSS vars are produced by `next/font` in Task 10; until then the fallbacks render.)

- [ ] **Step 4: Rewrite `components.json` for Tailwind v4 (shadcn CLI compatibility)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```
(Empty `config` = v4 style; prevents the CLI regenerating v3 output later.)

- [ ] **Step 5: Delete `tailwind.config.ts` and verify**

```bash
git rm tailwind.config.ts
npm run build
```
Expected: green. Grep `src/` for `tailwind.config` references — none should exist.

- [ ] **Step 6: Visual smoke + commit**

```bash
npm run dev
```
Open `http://localhost:3000` — placeholder heading renders with body font, background token applied. Stop server.

```bash
git add -A && git commit -m "feat: Tailwind v4 with design token system from UI spec"
```

---

### Task 4: Env validation system + Vitest harness

**Files:**
- Create: `src/lib/env.ts`, `vitest.config.ts`, `tests/env.test.ts`
- Modify: `.env.example` (add comments)

**Interfaces:**
- Produces: `parseEnv(source: Record<string, string | undefined>): Env` — throws ZodError with ALL missing vars listed. `Env = { DATABASE_URL: string; APP_URL: string; NODE_ENV: 'development'|'production'|'test' }`. Exported `getEnv(): Env` (lazy, memoized) used by server modules.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

```bash
npm install -D vitest
```

- [ ] **Step 2: Write the failing test `tests/env.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("parses a valid environment", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
      NODE_ENV: "development",
    });
    expect(env.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/db");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("throws listing every missing variable", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrowError(/APP_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://localhost/db",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrowError();
  });

  it("defaults NODE_ENV to development", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
    });
    expect(env.NODE_ENV).toBe("development");
  });
});
```

- [ ] **Step 3: Run test, verify failure**

```bash
npx vitest run tests/env.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/env'`.

- [ ] **Step 4: Implement `src/lib/env.ts`**

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL must be a postgresql:// connection string",
    }),
  APP_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
```

```bash
npm install zod@^3
```
(zod v4 exists; v3 is pinned to match surviving `@hookform/resolvers` + `form.tsx` — upgrade deliberately later.)

- [ ] **Step 5: Run test, verify pass; add `test` script**

```bash
npx vitest run tests/env.test.ts
```
Expected: 4 passed.

`package.json` scripts add: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: zod-validated env system + vitest harness"
```

---

### Task 5: Database foundation (Drizzle + Postgres + docker-compose)

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `src/db/connection.ts`, `src/db/client.ts`, `src/db/schema.ts` (empty barrel for now), `scripts/db-check.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `db` — Drizzle instance from `src/db/connection.ts` (plain module, importable by tsx scripts). `src/db/client.ts` re-exports it behind `server-only` for app code. Scripts: `db:generate` (drizzle-kit), `db:migrate` (migrate), `db:studio`, `db:check`.

- [ ] **Step 1: Install deps**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit tsx
```

- [ ] **Step 2: Create `docker-compose.yml` (local Postgres)**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: tripmate-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tripmate
    ports:
      - "5432:5432"
    volumes:
      - tripmate_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  tripmate_pgdata:
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
npm install dotenv
```

- [ ] **Step 4: Create `src/db/connection.ts` + `src/db/client.ts`**

`src/db/connection.ts` — plain module, NO `server-only` (scripts like seed run it via tsx, where `server-only` would throw at import time):

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const client = postgres(getEnv().DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export type Database = typeof db;
```

`src/db/client.ts` — the app-facing import, fenced:

```ts
import "server-only";

export { db, type Database } from "./connection";
```

```bash
npm install server-only
```
Rule: app code imports `@/db/client`; tsx scripts (seed, db-check) import `@/db/connection`. The npm `server-only` package throws outside the `react-server` condition — that's exactly the fence we want for app code, and exactly why scripts bypass it.

- [ ] **Step 5: Create empty barrel `src/db/schema.ts` (fills up in Tasks 6–8)**

```ts
export {};
```

- [ ] **Step 6: Create `scripts/db-check.ts` (connection smoke)**

```ts
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const result = await sql`select version()`;
  console.log(result[0].version);
  await sql.end();
}

main();
```
(Top-level await fails under tsx's CJS output — wrap in `main()`. dotenv must be imported explicitly; tsx does not auto-load `.env`.)

- [ ] **Step 7: Add scripts to `package.json`**

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:check": "tsx scripts/db-check.ts"
```

- [ ] **Step 8: Start Postgres, verify connection, commit**

```bash
docker compose up -d
cp .env.example .env
npm run db:check
```
Expected: prints `PostgreSQL 16.x ...`. (No Docker? Point `DATABASE_URL` in `.env` at a free Neon branch instead.)

```bash
git add -A && git commit -m "feat: drizzle + postgres foundation with docker-compose"
```

---

### Task 6: Schema — core tables (users, settings, media, tracking)

**Files:**
- Create: `src/modules/users/schema.ts`, `src/modules/settings/schema.ts`, `src/modules/media/schema.ts`, `src/modules/tracking/schema.ts`
- Modify: `src/db/schema.ts` (barrel)

**Interfaces:**
- Produces (exported names used by later plans): tables `users`, `settings`, `mediaFiles`, `trackingEvents`; pgEnums `userRoleEnum`, `mediaDiskEnum`. Column names snake_case as spec §5.

- [ ] **Step 1: Write `src/modules/users/schema.ts`**

```ts
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "superadmin",
  "admin",
  "staff",
  "customer",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: text("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  permissions: text("permissions").array(), // null = role defaults
  leadId: uuid("lead_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```
(Permissions stored as `text[]` — simpler to query than jsonb for membership checks. Better Auth will add its own tables in Plan 2; this domain table is ours.)

- [ ] **Step 2: Write `src/modules/settings/schema.ts`**

```ts
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Write `src/modules/media/schema.ts`**

```ts
import { pgEnum, pgTable, text, timestamp, uuid, bigint } from "drizzle-orm/pg-core";

export const mediaDiskEnum = pgEnum("media_disk", ["local", "r2"]);

export const mediaFiles = pgTable("media_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  disk: mediaDiskEnum("disk").notNull().default("local"),
  path: text("path").notNull(),
  url: text("url").notNull(),
  mime: text("mime").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  alt: text("alt"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Write `src/modules/tracking/schema.ts`**

```ts
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonId: text("anon_id"),
  sessionId: text("session_id"),
  userId: uuid("user_id"),
  eventName: text("event_name").notNull(),
  sourceUrl: text("source_url"),
  referrer: text("referrer"),
  fbParams: jsonb("fb_params"),
  capiStatus: text("capi_status"),
  capiResponse: jsonb("capi_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Wire barrel `src/db/schema.ts`**

```ts
export * from "@/modules/users/schema";
export * from "@/modules/settings/schema";
export * from "@/modules/media/schema";
export * from "@/modules/tracking/schema";
```

- [ ] **Step 6: Generate + run migration, verify, commit**

```bash
npm run db:generate && npm run db:migrate
```
Expected: migration file created in `drizzle/`, applied without error.

```bash
npm run typecheck && npm run build
```
Expected: green.

```bash
git add -A && git commit -m "feat(db): core schema — users, settings, media, tracking"
```

---

### Task 7: Schema — catalog + content tables

**Files:**
- Create: `src/modules/catalog/schema.ts`, `src/modules/content/schema.ts`
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `serviceCategories`, `listings`, `destinations`, `posts`, `postCategories`, `pages`; enums `serviceKindEnum`, `listingStatusEnum`, `contentStatusEnum` (draft/published, shared by posts and pages).

- [ ] **Step 1: Write `src/modules/catalog/schema.ts`**

```ts
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const serviceKindEnum = pgEnum("service_kind", [
  "package",
  "inquiry_based",
  "redirect",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "published",
  "archived",
]);

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  kind: serviceKindEnum("kind").notNull(),
  redirectUrl: text("redirect_url"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => serviceCategories.id),
  destinationId: uuid("destination_id").references(() => destinations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  description: text("description"),
  coverImage: jsonb("cover_image"),
  gallery: jsonb("gallery"),
  videoUrl: text("video_url"),
  durationDays: integer("duration_days"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("BDT"),
  itinerary: jsonb("itinerary"),
  inclusions: jsonb("inclusions"),
  exclusions: jsonb("exclusions"),
  formConfig: jsonb("form_config"),
  status: listingStatusEnum("status").notNull().default("draft"),
  seo: jsonb("seo"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Write `src/modules/content/schema.ts`**

```ts
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
]);

export const postCategories = pgTable("post_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  featuredImage: jsonb("featured_image"),
  gallery: jsonb("gallery"),
  videoUrl: text("video_url"),
  authorId: uuid("author_id"),
  categoryId: uuid("category_id").references(() => postCategories.id),
  status: contentStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seo: jsonb("seo"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sections: jsonb("sections"),
  seo: jsonb("seo"),
  status: contentStatusEnum("status").notNull().default("draft"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Extend barrel, migrate, commit**

`src/db/schema.ts` add:
```ts
export * from "@/modules/catalog/schema";
export * from "@/modules/content/schema";
```

```bash
npm run db:generate && npm run db:migrate && npm run typecheck
git add -A && git commit -m "feat(db): catalog + content schema"
```

---

### Task 8: Schema — leads, orders, payments, expenses

**Files:**
- Create: `src/modules/leads/schema.ts`, `src/modules/bookings/schema.ts`, `src/modules/payments/schema.ts`, `src/modules/expenses/schema.ts`
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `landingPages`, `leads`, `leadEvents`, `orders`, `orderStatusEvents`, `travelers`, `paymentGateways`, `payments`, `expenseCategories`, `expenses` + enums `leadStatusEnum`, `leadSourceEnum`, `orderTypeEnum`, `orderStatusEnum`, `orderSourceEnum`, `gatewayKindEnum`, `paymentStatusEnum`, `expenseStatusEnum`, `expenseKindEnum`.

- [ ] **Step 1: Write `src/modules/leads/schema.ts`**

```ts
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "converted",
  "lost",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "landing",
  "organic",
  "manual",
]);

export const landingPages = pgTable("landing_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sections: jsonb("sections"),
  formConfig: jsonb("form_config"),
  seo: jsonb("seo"),
  status: text("status").notNull().default("draft"),
  fbContentId: text("fb_content_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  landingPageId: uuid("landing_page_id").references(() => landingPages.id),
  listingId: uuid("listing_id"),
  source: leadSourceEnum("source").notNull().default("landing"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  message: text("message"),
  formData: jsonb("form_data"),
  status: leadStatusEnum("status").notNull().default("new"),
  assignedTo: uuid("assigned_to"),
  convertedOrderId: uuid("converted_order_id"),
  score: integer("score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  actorId: uuid("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Write `src/modules/bookings/schema.ts`**

```ts
import {
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orderTypeEnum = pgEnum("order_type", ["package", "inquiry"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "in_review",
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
]);

export const orderSourceEnum = pgEnum("order_source", [
  "website",
  "lead_conversion",
  "manual",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: text("order_no").notNull().unique(),
  userId: uuid("user_id"),
  customerSnapshot: jsonb("customer_snapshot").notNull(),
  listingId: uuid("listing_id"),
  listingSnapshot: jsonb("listing_snapshot"),
  type: orderTypeEnum("type").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  quotedPrice: numeric("quoted_price", { precision: 14, scale: 2 }),
  finalPrice: numeric("final_price", { precision: 14, scale: 2 }),
  currency: text("currency").notNull().default("BDT"),
  specialRequests: text("special_requests"),
  source: orderSourceEnum("source").notNull().default("website"),
  leadId: uuid("lead_id"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusEvents = pgTable("order_status_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  actorId: uuid("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const travelers = pgTable("travelers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  name: text("name").notNull(),
  passportNo: text("passport_no"),
  dob: text("dob"),
  relation: text("relation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Write `src/modules/payments/schema.ts`**

```ts
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { orders } from "@/modules/bookings/schema";

export const gatewayKindEnum = pgEnum("gateway_kind", [
  "manual",
  "paylater",
  "sslcommerz",
  "bkash",
  "nagad",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "refunded",
]);

export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  kind: gatewayKindEnum("kind").notNull(),
  config: jsonb("config"),
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  gatewayId: uuid("gateway_id").references(() => paymentGateways.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BDT"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  methodTxnId: text("method_txn_id"),
  senderNumber: text("sender_number"),
  submittedScreenshotUrl: text("submitted_screenshot_url"),
  verifiedBy: uuid("verified_by"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Write `src/modules/expenses/schema.ts`**

```ts
import {
  boolean,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const expenseKindEnum = pgEnum("expense_kind", [
  "operational",
  "cost_of_sales",
  "other",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "pending",
  "approved",
  "rejected",
]);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: expenseKindEnum("kind").notNull().default("operational"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => expenseCategories.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BDT"),
  date: date("date").notNull(),
  description: text("description"),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  orderId: uuid("order_id"),
  createdBy: uuid("created_by"),
  status: expenseStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Extend barrel, migrate, verify, commit**

`src/db/schema.ts` final form:
```ts
export * from "@/modules/users/schema";
export * from "@/modules/settings/schema";
export * from "@/modules/media/schema";
export * from "@/modules/tracking/schema";
export * from "@/modules/catalog/schema";
export * from "@/modules/content/schema";
export * from "@/modules/leads/schema";
export * from "@/modules/bookings/schema";
export * from "@/modules/payments/schema";
export * from "@/modules/expenses/schema";
```

```bash
npm run db:generate && npm run db:migrate && npm run typecheck && npm run build
```
Expected: all green. `npx drizzle-kit studio` — spot-check tables exist.

```bash
git add -A && git commit -m "feat(db): leads, orders, payments, expenses schema — v2 data model complete"
```

---

### Task 9: Seed script (demo catalog + default settings)

**Files:**
- Create: `src/db/seed.ts`
- Modify: `package.json` (script `db:seed`)

**Interfaces:**
- Produces: `npm run db:seed` — idempotent (skips if data exists). Seeds: 6 service categories (Tour, Hajj, Umrah, Medical, Flight, Visa/Passport), 4 destinations, 3 demo listings, default settings keys (`site`, `home`, `setup` with `setup_complete: false`), 3 manual payment gateways (bKash manual, Nagad manual, Bank transfer).

- [ ] **Step 1: Write `src/db/seed.ts`**

```ts
import "dotenv/config";
import { db } from "./connection";
import {
  destinations,
  listings,
  paymentGateways,
  serviceCategories,
  settings,
} from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceCategories);
  if (existing[0].count > 0) {
    console.log("Seed skipped: data already present.");
    return;
  }

  const cats = await db
    .insert(serviceCategories)
    .values([
      { name: "Tour Packages", slug: "tour-packages", kind: "package", sortOrder: 1, icon: "compass" },
      { name: "Hajj", slug: "hajj", kind: "package", sortOrder: 2, icon: "moon-star" },
      { name: "Umrah", slug: "umrah", kind: "package", sortOrder: 3, icon: "moon" },
      { name: "Medical Travel", slug: "medical-travel", kind: "package", sortOrder: 4, icon: "heart-pulse" },
      { name: "Flight Tickets", slug: "flight-tickets", kind: "inquiry_based", sortOrder: 5, icon: "plane-takeoff" },
      { name: "Visa & Passport", slug: "visa-passport", kind: "inquiry_based", sortOrder: 6, icon: "file-check" },
    ])
    .returning();

  const dests = await db
    .insert(destinations)
    .values([
      { name: "Makkah & Madinah", slug: "makkah-madinah" },
      { name: "Malaysia & Singapore", slug: "malaysia-singapore" },
      { name: "Dubai", slug: "dubai" },
      { name: "Cox's Bazar & Sylhet", slug: "coxs-bazar-sylhet" },
    ])
    .returning();

  const hajj = cats.find((c) => c.slug === "hajj")!;
  const umrah = cats.find((c) => c.slug === "umrah")!;
  const tour = cats.find((c) => c.slug === "tour-packages")!;
  const mm = dests.find((d) => d.slug === "makkah-madinah")!;

  await db.insert(listings).values([
    {
      categoryId: hajj.id,
      destinationId: mm.id,
      title: "Premium Hajj Package 2026",
      slug: "premium-hajj-2026",
      summary: "21 days, 5-star hotels near Haramain, scholar guidance.",
      price: "850000",
      durationDays: 21,
      currency: "BDT",
      status: "published",
      itinerary: [
        { day: "1-10", title: "Makkah", details: "Ibadah in Masjid al-Haram, 5-star stay." },
        { day: "11-15", title: "Manasik", details: "Guided Mina, Arafat, Muzdalifah." },
        { day: "16-20", title: "Madinah", details: "Ziyarat tours, hotel by Masjid an-Nabawi." },
        { day: "21", title: "Departure", details: "Final prayer and departure." },
      ],
      inclusions: ["5-star hotels", "Visa processing", "Full board"],
      exclusions: ["Flights", "Personal expenses"],
    },
    {
      categoryId: umrah.id,
      destinationId: mm.id,
      title: "Economy Umrah Package",
      slug: "economy-umrah",
      summary: "10 days, clean 3-star hotels, group transport.",
      price: "120000",
      durationDays: 10,
      currency: "BDT",
      status: "published",
    },
    {
      categoryId: tour.id,
      title: "Malaysia-Singapore Family Tour",
      slug: "malaysia-singapore-family-tour",
      summary: "7 days, family-friendly, all transfers.",
      price: "145000",
      durationDays: 7,
      currency: "BDT",
      status: "published",
    },
  ]);

  await db.insert(settings).values([
    {
      key: "site",
      value: {
        title: "TripMate",
        logoUrl: "/logo.svg",
        faviconUrl: "/favicon.svg",
        searchEngineVisibility: true,
        phone: "+8801000000000",
        email: "info@tripmate.example",
        address: "Dhaka, Bangladesh",
      },
    },
    { key: "home", value: { heroHeadline: "Your Journey Begins Here", heroSub: "Hajj, Umrah, tours, flights & visa — one trusted agency." } },
    { key: "storage", value: { driver: "local" } },
    { key: "setup", value: { setupComplete: false } },
  ]);

  await db.insert(paymentGateways).values([
    {
      name: "bKash (Manual)",
      kind: "manual",
      sortOrder: 1,
      config: { accountType: "personal", number: "+8801000000000" },
      instructions: "Send the amount to the bKash number, then submit the transaction ID below.",
    },
    {
      name: "Nagad (Manual)",
      kind: "manual",
      sortOrder: 2,
      config: { accountType: "personal", number: "+8801000000000" },
      instructions: "Send the amount to the Nagad number, then submit the transaction ID below.",
    },
    {
      name: "Bank Transfer",
      kind: "manual",
      sortOrder: 3,
      config: { bankName: "Example Bank", accountName: "TripMate Travel", accountNo: "0000000000", branch: "Gulshan" },
      instructions: "Transfer to the bank account, then submit the deposit slip.",
    },
  ]);

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add script + run**

`package.json` scripts add:
```json
"db:seed": "tsx src/db/seed.ts"
```

```bash
npm run db:seed
```
Expected: `Seed complete.` Run again → `Seed skipped: data already present.`

- [ ] **Step 3: Verify data, commit**

```bash
npx drizzle-kit studio
```
Spot-check: 6 categories, 4 destinations, 3 listings, 4 settings rows, 3 gateways.

```bash
git add -A && git commit -m "feat(db): idempotent seed — demo catalog, settings, manual gateways"
```

---

### Task 10: App shell (fonts, not-found, error) + Playwright smoke

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/app/not-found.tsx`, `src/app/error.tsx`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: fonts wired (`--font-fraunces`, `--font-inter` CSS vars on `<html>`, weights pinned to the UI-spec budget), favicon + viewport/themeColor, error boundary with digest (no raw error text), Playwright `npm run test:e2e` green. Skip-link + full a11y §7 items are explicitly owned by Plan 3's public shell task; the global `:focus-visible` ring already shipped in Task 3.

- [ ] **Step 1: Rewrite `src/app/layout.tsx` with next/font**

```tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: { default: "TripMate", template: "%s | TripMate" },
  description: "Hajj & Umrah packages, tours, flights and visa services.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0F14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `src/app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">This page wandered off the itinerary.</p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/error.tsx`**

```tsx
"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-4xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        Something unexpected happened. Please try again.
        {error.digest && <span className="block text-xs">Ref: {error.digest}</span>}
      </p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Try again
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Set up Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("home renders the foundation placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TripMate");
});

test("unknown route renders 404 page", async ({ page }) => {
  await page.goto("/this-does-not-exist");
  await expect(page.getByText("404")).toBeVisible();
});
```

`package.json` scripts add: `"test:e2e": "playwright test"`.

- [ ] **Step 5: Run e2e, verify, commit**

```bash
npm run test:e2e
```
Expected: 2 passed.

```bash
git add -A && git commit -m "feat: app shell — fonts, error boundaries, playwright e2e smoke"
```

---

### Task 11: Rate limiter (TDD) + module skeleton generator

**Files:**
- Create: `src/lib/rate-limit.ts`, `tests/rate-limit.test.ts`, `scripts/new-module.mjs`
- Modify: `package.json` (script `new-module`)

**Interfaces:**
- Produces: `class SlidingWindowRateLimiter { constructor(opts: { limit: number; windowMs: number }); check(key: string, now?: number): { allowed: boolean; remaining: number } }` — pure in-memory, injectable clock (Plan 2's `withGuard` consumes it). `npm run new-module <name>` creates `src/modules/<name>/{schema.ts,service.ts,actions.ts,validation.ts}`.

- [ ] **Step 1: Write failing test `tests/rate-limit.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows up to limit requests within the window", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("ip-1", 1000).allowed).toBe(true);
    expect(rl.check("ip-1", 2000).allowed).toBe(true);
    expect(rl.check("ip-1", 3000).allowed).toBe(true);
    expect(rl.check("ip-1", 4000).allowed).toBe(false);
  });

  it("allows again after the window slides past old hits", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 2, windowMs: 10_000 });
    rl.check("ip-1", 1000);
    rl.check("ip-1", 2000);
    expect(rl.check("ip-1", 3000).allowed).toBe(false);
    expect(rl.check("ip-1", 11_500).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(rl.check("a", 1000).allowed).toBe(true);
    expect(rl.check("b", 1000).allowed).toBe(true);
    expect(rl.check("a", 2000).allowed).toBe(false);
  });

  it("reports remaining count", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("k", 1000).remaining).toBe(2);
    expect(rl.check("k", 2000).remaining).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
npx vitest run tests/rate-limit.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/rate-limit.ts`**

```ts
export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private opts: RateLimitOptions) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.opts.windowMs;
    const hits = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (hits.length >= this.opts.limit) {
      this.hits.set(key, hits);
      return { allowed: false, remaining: 0 };
    }

    hits.push(now);
    this.hits.set(key, hits);
    return { allowed: true, remaining: this.opts.limit - hits.length };
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
npx vitest run tests/rate-limit.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Create `scripts/new-module.mjs`**

```js
#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Usage: npm run new-module <kebab-case-name>");
  process.exit(1);
}

const dir = join("src", "modules", name);
mkdirSync(dir, { recursive: true });

const files = {
  "schema.ts": `// Drizzle tables for the ${name} module.\nexport {};\n`,
  "service.ts": `// All DB queries for the ${name} module. Server-only.\nimport "server-only";\n`,
  "actions.ts": `// 'use server' mutations for the ${name} module. Guard every action.\n`,
  "validation.ts": `import { z } from "zod";\n\n// Zod schemas for the ${name} module.\n`,
};

for (const [file, content] of Object.entries(files)) {
  writeFileSync(join(dir, file), content);
}

console.log(`Module skeleton created: src/modules/${name}`);
console.log("Remember to export its schema from src/db/schema.ts.");
```

`package.json` scripts add: `"new-module": "node scripts/new-module.mjs"`.

- [ ] **Step 6: Verify generator, clean up, commit**

```bash
npm run new-module example-x
```
Expected: files created. Inspect, then delete:
```bash
rm -r src/modules/example-x
```

```bash
git add -A && git commit -m "feat: sliding-window rate limiter + module skeleton generator"
```

---

### Task 12: Final verification + README

**Files:**
- Modify: `README.md` (rewrite), `.env.example` (final form for this plan)

**Interfaces:**
- Produces: green full gate (`lint`, `typecheck`, `build`, `test`, `test:e2e`) + README documenting setup for the next plan executor.

- [ ] **Step 1: Finalize `.env.example`**

```bash
# --- Core (required) ---
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tripmate
APP_URL=http://localhost:3000

# --- Later plans (documented, not validated yet) ---
# AUTH_SECRET=<openssl rand -base64 32>            # Plan 2: Better Auth
# SMTP_HOST=                                       # Plan 6: email
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM="TripMate <no-reply@tripmate.example>"
# STORAGE_DRIVER=local                             # Plan 3: local | r2
# R2_ACCOUNT_ID=                                   # Plan 3: if STORAGE_DRIVER=r2
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=
# R2_PUBLIC_URL=
# META_PIXEL_ID=                                   # Plan 4: Meta CAPI
# META_CAPI_ACCESS_TOKEN=
# META_CAPI_TEST_CODE=
```

- [ ] **Step 2: Rewrite `README.md`**

```markdown
# TripMate v2

High-performance tour & travel agency platform — Hajj/Umrah packages, tours,
flight & visa inquiry, lead generation with landing pages, Meta CAPI tracking,
payments and expense management.

## Stack
Next.js 16 (Turbopack, typed routes) · React 19.2 · TypeScript strict ·
Tailwind CSS v4 · Drizzle ORM + PostgreSQL · Zod · Vitest + Playwright

## Getting started
1. `npm install`
2. `docker compose up -d` (local Postgres — or point DATABASE_URL at Neon)
3. `cp .env.example .env` and fill values
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`

## Commands
- `npm run dev` / `build` / `start`
- `npm run lint` / `typecheck` — hard gates, no ignores
- `npm run test` / `test:e2e`
- `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` / `db:check`
- `npm run new-module <name>` — module skeleton generator

## Docs
- Architecture spec: `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md`
- UI design system: `docs/superpowers/specs/2026-09-05-ui-design-system.md`
- Implementation plans: `docs/superpowers/plans/`
```

- [ ] **Step 3: Full gate**

```bash
npm run lint && npm run typecheck && npm run build && npm run test && npm run test:e2e
```
Expected: ALL green. Any failure → fix before proceeding (investigate-first, no shortcut flags).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: starter README + final env template — foundation plan complete"
```

---

## Verification Checklist (plan-level acceptance)

- [ ] Zero Firebase/genkit imports: `grep -r "firebase\|genkit" src/ package.json` → no hits
- [ ] `next.config.ts` contains no `ignoreBuildErrors` / `ignoreDuringBuilds`
- [ ] No `tailwind.config.*` file; tokens live in `globals.css` `@theme`
- [ ] `drizzle/` migrations committed; `npm run db:migrate` clean on fresh DB
- [ ] `npm run db:seed` twice → second run skips
- [ ] All 20 domain tables exist (users, settings, media_files, tracking_events, service_categories, destinations, listings, post_categories, posts, pages, landing_pages, leads, lead_events, orders, order_status_events, travelers, payment_gateways, payments, expense_categories, expenses — Better Auth's session/account/verification tables arrive in Plan 2)
- [ ] Full gate green (lint + typecheck + build + test + e2e)
