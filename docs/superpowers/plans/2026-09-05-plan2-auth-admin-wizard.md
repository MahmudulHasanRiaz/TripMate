# TripMate v2 — Plan 2: Auth + Admin Shell + Setup Wizard + Email Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authentication with server-enforced roles/permissions, the browser-based first-run setup wizard (env-file writing, per-key detection, no-echo guarantee), the admin shell, and the SMTP email foundation — everything Plans 3-6 build on.

**Architecture:** Better Auth on the existing `users` table (drizzle adapter, httpOnly sessions). `withGuard` wraps every server action (permission + rate limit). Private config values live in env only — the wizard writes `.env` atomically on writable deploys and instructs/re-checks on Vercel/Portainer. Email sends through SMTP with no-op fallback when unconfigured.

**Tech Stack:** better-auth, drizzle, nodemailer + react-email, @aws-sdk/client-s3 (R2 connection test only), existing Vitest/Playwright harness.

**Spec:** `docs/superpowers/specs/2026-09-05-tripmate-v2-design.md` — especially §6 (auth/security), §12 (setup wizard — READ FULLY before Task 7-11), §15 Phase 3. UI: `docs/superpowers/specs/2026-09-05-ui-design-system.md` §5 (admin patterns), §7 (a11y). For UI tasks, consult the `ui-ux-pro-max` skill's guidelines (user mandate).

**Plan series position:** Plan 2 of 7. Plan 1 (foundation) is merged — Next 16.3.4, Tailwind v4 tokens, Drizzle (20 tables, 3 migrations), Vitest+Playwright, rate limiter, module generator all live.

## Global Constraints

- TypeScript strict; build gates hard (no ignores). Conventional Commits per task.
- All DB access via `@/db/client` (server-only) — `@/db/connection` importable ONLY from `src/db/**` and `scripts/**` (lint-enforced in Task 5).
- Every server action goes through `withGuard` (Task 4) — no naked exported mutations.
- Private values (AUTH_SECRET, R2 creds, SMTP creds, CAPI token) NEVER stored in DB, NEVER echoed to any response — boolean `configured` state only.
- Role NEVER comes from the client; every guarded path re-reads the session server-side.
- Users' email stored lowercase; unique.
- zod@^3 (installed), eslint ^9, TS 6.0.3 — do not bump majors.
- Dev DB: host PG18 `postgresql://tripmate:tripmate_dev_2026@localhost:5432/tripmate` (in `.env`). Seed data present; `setup` setting = `{ setupComplete: false }`; no users exist yet.
- Better Auth version drift: the code below targets the current v1-style API. If the installed version's exports differ, the implementer reads `node_modules/better-auth/README.md` (or docs shipped in the package) and adapts the call sites — the REQUIREMENTS (adapter, plural tables, additional fields, min password 10, httpOnly) are the contract, not the exact function signature. Report any adaptation in the task report.

---

### Task 1: Better Auth foundation

**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/modules/users/schema.ts` (add emailVerified), `src/lib/env.ts` (AUTH_SECRET), `.env.example`, `.env` (generate secret)
- Create: `drizzle/0003_*.sql` (via CLI)

**Interfaces:**
- Produces: `auth` (Better Auth instance, server-only), env gains required `AUTH_SECRET: string`. New tables: `sessions`, `accounts`, `verifications` (Better Auth standard, plural). `users.emailVerified: boolean`.

- [ ] **Step 1: Install + schema extension**

```bash
npm install better-auth
```

`src/modules/users/schema.ts` — add to `users` table (keep everything else):
```ts
emailVerified: boolean("email_verified").notNull().default(false),
```
(import `boolean`.) Also add the three Better Auth tables to this file — generate them with the CLI and paste into the module (do NOT let the CLI create a separate file; our convention: users module owns all auth tables):
```bash
npx @better-auth/cli generate --config src/lib/auth.ts 2>/dev/null || npx @better-auth/cli generate
```
Adjust generated table names to plural (`session`→`sessions` etc.) if the generator emits singular, matching `usePlural: true` in Step 2. Rename columns to snake_case per our convention. Expected columns (v1 baseline): sessions(id, expiresAt, token unique, createdAt, updatedAt, ipAddress, userAgent, userId fk→users); accounts(id, accountId, providerId, userId fk, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt); verifications(id, identifier, value, expiresAt, createdAt, updatedAt).

- [ ] **Step 2: Extend env schema — `src/lib/env.ts`**

```ts
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL must be a postgresql:// connection string",
    }),
  APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});
```
Update `tests/env.test.ts` fixtures to include `AUTH_SECRET: "a".repeat(32)` style values in every `parseEnv` call (keep the 4 test cases, add one: rejects short AUTH_SECRET).

`.env.example` add under Core: `AUTH_SECRET=<openssl rand -base64 32, or let the setup wizard generate>`.
`.env` (local, gitignored): generate and set one now:
```bash
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))" >> .env
```

- [ ] **Step 3: Create `src/lib/auth.ts` (server-only)**

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
      phone: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 },
  },
});
```
(`input: false` — role/phone are server-controlled, never client-writable during signup. If the installed version rejects `input: false`, use its equivalent "server-only field" mechanism and note it.)

- [ ] **Step 4: Migration + verify**

```bash
npm run db:generate && npm run db:migrate && npm run typecheck && npm run lint && npm run test
```
Expected: migration 0003 creates 3 tables + alters users; all gates green.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(auth): better-auth foundation on users table"
```

---

### Task 2: Roles, permissions + session helpers

**Files:**
- Create: `src/modules/users/permissions.ts`, `src/lib/auth-helpers.ts`, `tests/permissions.test.ts`
- Modify: `src/modules/users/schema.ts` (nothing — permissions are code-level)

**Interfaces:**
- Produces: `PERMISSIONS` (const array), `ROLE_PERMISSIONS: Record<UserRole, string[]>`, `hasPermission(role, userPermissions, key): boolean`, `requireSession(): Promise<Session>`, `requireRole(...roles): Promise<Session>`, `requirePermission(key): Promise<Session>` — all server-only, throw redirect/typed error on failure.

- [ ] **Step 1: Write failing tests `tests/permissions.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, hasPermission, PERMISSIONS } from "@/modules/users/permissions";

describe("permissions", () => {
  it("superadmin has every permission", () => {
    for (const p of PERMISSIONS) {
      expect(hasPermission("superadmin", null, p)).toBe(true);
    }
  });

  it("admin has all except users.manage and settings.manage", () => {
    expect(hasPermission("admin", null, "leads.manage")).toBe(true);
    expect(hasPermission("admin", null, "users.manage")).toBe(false);
    expect(hasPermission("admin", null, "settings.manage")).toBe(false);
  });

  it("staff has operational permissions only", () => {
    expect(hasPermission("staff", null, "leads.manage")).toBe(true);
    expect(hasPermission("staff", null, "catalog.manage")).toBe(true);
    expect(hasPermission("staff", null, "payments.verify")).toBe(true);
    expect(hasPermission("staff", null, "expenses.submit")).toBe(true);
    expect(hasPermission("staff", null, "users.manage")).toBe(false);
    expect(hasPermission("staff", null, "payments.manage_gateways")).toBe(false);
  });

  it("customer has none", () => {
    expect(hasPermission("customer", null, "leads.manage")).toBe(false);
  });

  it("user permission overrides grant beyond role", () => {
    expect(hasPermission("staff", ["users.manage"], "users.manage")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify RED** — `npx vitest run tests/permissions.test.ts` → module not found.

- [ ] **Step 3: Implement `src/modules/users/permissions.ts`**

```ts
export const PERMISSIONS = [
  "catalog.manage",
  "orders.manage",
  "orders.view",
  "leads.manage",
  "leads.view",
  "payments.verify",
  "payments.manage_gateways",
  "content.manage",
  "media.manage",
  "users.manage",
  "settings.manage",
  "tracking.view",
  "expenses.submit",
  "expenses.approve",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type UserRole = "superadmin" | "admin" | "staff" | "customer";

const STAFF: Permission[] = [
  "catalog.manage",
  "orders.manage",
  "orders.view",
  "leads.manage",
  "leads.view",
  "content.manage",
  "media.manage",
  "payments.verify",
  "expenses.submit",
];

const ADMIN: Permission[] = [
  ...STAFF,
  "payments.manage_gateways",
  "expenses.approve",
  "tracking.view",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [...PERMISSIONS],
  admin: ADMIN,
  staff: STAFF,
  customer: [],
};

export function hasPermission(
  role: UserRole,
  userPermissions: string[] | null,
  key: string,
): boolean {
  if (role === "superadmin") return true;
  if (userPermissions?.includes(key)) return true;
  return ROLE_PERMISSIONS[role]?.includes(key as Permission) ?? false;
}
```

- [ ] **Step 4: GREEN + implement `src/lib/auth-helpers.ts`**

```ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, type UserRole } from "@/modules/users/permissions";

export type Session = {
  user: { id: string; email: string; name: string; role: UserRole; phone?: string | null };
  session: { id: string; userId: string; expiresAt: Date };
};

export async function getSession(): Promise<Session | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.user) return null;
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: (result.user as Session["user"]).role ?? "customer",
      phone: (result.user as Session["user"]).phone ?? null,
    },
    session: result.session,
  } as Session;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}

export async function requirePermission(key: string): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.user.role, null, key)) redirect("/");
  return session;
}
```
(If getSession's return shape differs in the installed better-auth version, adapt — the contract is: server-side read of session + user with role, redirect on missing.)

- [ ] **Step 5: Email lowercase normalization**

In `src/modules/users/schema.ts` keep the column as-is; add to `src/lib/auth.ts` (betterAuth config) — `emailAndPassword: { enabled: true, minPasswordLength: 10 }` already lowercases? Do not assume: add a `hooks`/`before` callback if the version supports it that lowercases `user.email` on create; if not supported, note it — signup action (Task 12) will lowercase before calling. Ledger whichever path.

- [ ] **Step 6: Gates + commit**

```bash
npx vitest run tests/permissions.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(auth): role/permission model + server session helpers"
```

---

### Task 3: withGuard — the action wrapper

**Files:**
- Create: `src/lib/guard.ts`, `tests/guard.test.ts`

**Interfaces:**
- Produces: `withGuard<TInput, TOutput>(opts: { permission?: string; rateLimit?: { limit: number; windowMs: number }; public?: boolean }, action: (input: TInput, session: Session | null) => Promise<TOutput>)` returns a guarded server-action-compatible function. Throws `GuardError` with `code: "UNAUTHORIZED" | "RATE_LIMITED"`.

- [ ] **Step 1: Failing tests `tests/guard.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers", () => ({
  getSession: vi.fn(),
}));
import { getSession } from "@/lib/auth-helpers";
const mockSession = getSession as ReturnType<typeof vi.fn>;

const staffSession = {
  user: { id: "u1", email: "s@x.com", name: "S", role: "staff", phone: null },
  session: { id: "s1", userId: "u1", expiresAt: new Date() },
} as unknown as Session;

describe("withGuard", () => {
  it("runs public actions without session", async () => {
    mockSession.mockResolvedValue(null);
    const fn = withGuard({ public: true }, async (x: number) => x * 2);
    expect(await fn(21)).toBe(42);
  });

  it("blocks non-public actions without session", async () => {
    mockSession.mockResolvedValue(null);
    const fn = withGuard({}, async () => 1);
    await expect(fn(null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks missing permission", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard({ permission: "users.manage" }, async () => 1);
    await expect(fn(null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows when permission held", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard({ permission: "leads.manage" }, async () => "ok");
    expect(await fn(null)).toBe("ok");
  });

  it("rate limits per key", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard(
      { public: true, rateLimit: { limit: 2, windowMs: 60_000 } },
      async () => "ok",
    );
    expect(await fn(null, "k1")).toBe("ok");
    expect(await fn(null, "k1")).toBe("ok");
    await expect(fn(null, "k1")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(await fn(null, "k2")).toBe("ok");
  });
});
```
Note: the guarded fn's second arg is an optional rate-limit key (client passes IP or form id; server actions will use `headers()` when key not given — for tests, explicit key).

- [ ] **Step 2: RED** → module not found.

- [ ] **Step 3: Implement `src/lib/guard.ts`**

```ts
import "server-only";
import { headers } from "next/headers";
import { getSession, type Session } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

export class GuardError extends Error {
  constructor(public code: "UNAUTHORIZED" | "RATE_LIMITED") {
    super(code);
  }
}

const limiter = new SlidingWindowRateLimiter({ limit: 100, windowMs: 60_000 });
const limiters = new Map<string, SlidingWindowRateLimiter>();

function getLimiter(limit: number, windowMs: number) {
  const key = `${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(key, new SlidingWindowRateLimiter({ limit, windowMs }));
  }
  return limiters.get(key)!;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}

export function withGuard<TInput, TOutput>(
  opts: {
    permission?: string;
    rateLimit?: { limit: number; windowMs: number };
    public?: boolean;
  },
  action: (input: TInput, session: Session | null) => Promise<TOutput>,
) {
  return async (input: TInput, rateKey?: string): Promise<TOutput> => {
    const session = await getSession();

    if (!opts.public && !session) throw new GuardError("UNAUTHORIZED");
    if (opts.permission && !session) throw new GuardError("UNAUTHORIZED");
    if (
      opts.permission &&
      session &&
      !hasPermission(session.user.role, null, opts.permission)
    ) {
      throw new GuardError("UNAUTHORIZED");
    }

    if (opts.rateLimit) {
      const key = rateKey ?? (await clientKey());
      const rl = getLimiter(opts.rateLimit.limit, opts.rateLimit.windowMs);
      if (!rl.check(key).allowed) throw new GuardError("RATE_LIMITED");
    }

    return action(input, session);
  };
}
```
(Importing `next/headers` inside a module unit-tested under vitest node-env: vitest will fail on `headers()` call — tests always pass an explicit rateKey OR use `public` without rateLimit... The `clientKey()` call only happens when `rateLimit` set and no explicit key. In the rate-limit test above keys are explicit. The unkeyed public test has no rateLimit → headers never called. OK, but `vi.mock` of next/headers may still be needed if the import itself throws — add `vi.mock("next/headers", () => ({ headers: async () => new Headers() }))` to the test file.)

- [ ] **Step 4: GREEN + gates + commit**

```bash
npx vitest run tests/guard.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(auth): withGuard action wrapper — permission + rate limit"
```

---

### Task 4: Settings service + env-file writer

**Files:**
- Create: `src/modules/settings/service.ts`, `src/lib/env-file.ts`, `tests/env-file.test.ts`, `tests/settings-service.test.ts`
- Modify: nothing else

**Interfaces:**
- Produces: `getSetting<T>(key): Promise<T | null>`, `setSetting(key, value): Promise<void>` (typed keys: "site" | "home" | "storage" | "setup" | more later). `ENV_WRITABLE_KEYS: string[]`, `isEnvWritable(): boolean` (probe write to `.env`), `readEnvFile(): Record<string,string>` (no values ever leave this server module except booleans), `writeEnvValues(values: Record<string,string>): void` (atomic, whitelist-only), `invalidateEnvCache(): void`.

- [ ] **Step 1: Settings service**

```ts
// src/modules/settings/service.ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/modules/settings/schema";

export type SiteSetting = {
  title: string; logoUrl: string; faviconUrl: string;
  searchEngineVisibility: boolean; phone: string; email: string; address: string;
};
export type StorageSetting = { driver: "local" | "r2" };
export type SetupSetting = { setupComplete: boolean };

const decoders = {
  site: null, home: null, storage: null, setup: null,
} as const;

export async function getSetting(key: "site"): Promise<SiteSetting | null>;
export async function getSetting(key: "storage"): Promise<StorageSetting | null>;
export async function getSetting(key: "setup"): Promise<SetupSetting | null>;
export async function getSetting(key: "home"): Promise<Record<string, unknown> | null>;
export async function getSetting(key: string): Promise<unknown> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as object })
    .onConflictDoUpdate({ target: settings.key, set: { value: value as object, updatedAt: new Date() } });
}
```
Unit test `tests/settings-service.test.ts`: mark as integration — skip in vitest (needs DB); instead assert pure behavior of onConflict shape via typecheck only. (If a real DB test is cheap later, Plan 7 CI adds it. For now: typecheck is the test.)

- [ ] **Step 2: Failing tests `tests/env-file.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnvFile, serializeEnvFile } from "@/lib/env-file";

describe("env-file parse/serialize (pure)", () => {
  it("parses KEY=VALUE lines, ignores comments and blanks", () => {
    const parsed = parseEnvFile("# comment\n\nA=1\nB=hello world\n");
    expect(parsed).toEqual({ A: "1", B: "hello world" });
  });

  it("replaces existing keys, preserves untouched lines and comments", () => {
    const out = serializeEnvFile("# header\nA=1\nB=2\n", { A: "9", C: "3" });
    expect(out).toContain("# header");
    expect(out).toContain("A=9");
    expect(out).not.toContain("A=1");
    expect(out).toContain("B=2");
    expect(out).toMatch(/C=3(\r?\n)?$/);
  });

  it("quotes values containing spaces or #", () => {
    const out = serializeEnvFile("", { FROM: "Trip Mate #1 <no-reply@x.com>" });
    expect(out).toContain('FROM="Trip Mate #1 <no-reply@x.com>"');
  });
});
```
(The write-to-disk part — atomicity, whitelist — is exercised via a temp-dir integration test: `writeEnvValues` accepts an optional target path param defaulting to `.env`; test with tmp path.)

Add to same file:
```ts
import { writeEnvValues, ENV_WRITABLE_KEYS } from "@/lib/env-file";

describe("writeEnvValues (tmp dir)", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "envtest-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("writes new keys and updates existing ones atomically", () => {
    writeFileSync(join(dir, ".env"), "OLD=keep\nR2_BUCKET_NAME=x\n");
    writeEnvValues({ R2_BUCKET_NAME: "y", SMTP_HOST: "smtp.x.com" }, join(dir, ".env"));
    const content = readFileSync(join(dir, ".env"), "utf8");
    expect(content).toContain("OLD=keep");
    expect(content).toContain("R2_BUCKET_NAME=y");
    expect(content).toContain("SMTP_HOST=smtp.x.com");
  });

  it("rejects keys outside the whitelist", () => {
    expect(() => writeEnvValues({ EVIL: "1" }, join(dir, ".env"))).toThrowError(/not writable/);
    expect(ENV_WRITABLE_KEYS).not.toContain("DATABASE_URL");
  });
});
```

- [ ] **Step 3: RED → implement `src/lib/env-file.ts`**

```ts
import "server-only";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const ENV_WRITABLE_KEYS = [
  "AUTH_SECRET",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
  "STORAGE_DRIVER",
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME", "R2_PUBLIC_URL",
  "META_PIXEL_ID", "META_CAPI_ACCESS_TOKEN", "META_CAPI_TEST_CODE",
] as const;

const ENV_PATH = resolve(process.cwd(), ".env");

export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

export function serializeEnvFile(
  current: string,
  updates: Record<string, string>,
): string {
  const lines = current.split(/\r?\n/);
  const updated = new Set(Object.keys(updates));
  const replaced = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && updated.has(m[1])) {
      updated.delete(m[1]);
      return `${m[1]}=${quote(updates[m[1]])}`;
    }
    return line;
  });
  for (const key of updated) replaced.push(`${key}=${quote(updates[key])}`);
  return replaced.join("\n");
}

function quote(value: string): string {
  return /[\s#"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

export function writeEnvValues(
  values: Record<string, string>,
  targetPath: string = ENV_PATH,
): void {
  for (const key of Object.keys(values)) {
    if (!(ENV_WRITABLE_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Key ${key} is not writable via the app`);
    }
  }
  const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const next = serializeEnvFile(current, values);
  const tmp = `${targetPath}.tmp`;
  writeFileSync(tmp, next, "utf8");
  renameSync(tmp, targetPath);
  for (const [k, v] of Object.entries(values)) process.env[k] = v;
}
```
Note: writing to `process.env` after the file write IS the hot-reload — modules that read `process.env.X` at call time (SMTP, R2 — built that way in Tasks 6-7) pick values up immediately. `getEnv()`'s cache stays boot-frozen for DATABASE_URL/APP_URL/AUTH_SECRET — by design (immutable keys).

`isEnvWritable()`:
```ts
export function isEnvWritable(): boolean {
  try {
    if (!existsSync(ENV_PATH)) {
      writeFileSync(ENV_PATH, "# written by setup wizard\n", { flag: "wx" });
      return true;
    }
    const probe = `${ENV_PATH}.probe`;
    writeFileSync(probe, "");
    renameSync(probe, ENV_PATH.replace(/$/, ".probe2"));
    import("node:fs").then((fs) => fs.rmSync(ENV_PATH + ".probe2", { force: true }));
    return true;
  } catch {
    return false;
  }
}
```
Simplify — implement without the async import: use fs.rmSync directly. (Exercise left verbatim: keep it synchronous and clean; the probe files are removed in the same call.)

- [ ] **Step 4: GREEN + gates + commit**

```bash
npx vitest run tests/env-file.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(settings): settings service + atomic env-file writer with key whitelist"
```

---

### Task 5: Fence lint + boot validation (final-review carry-ins)

**Files:**
- Modify: `eslint.config.mjs`
- Create: `src/instrumentation.ts`, `tests/boot.test.ts` (optional unit for register)
- Delete: nothing

**Interfaces:**
- Produces: lint error on `@/db/connection` imports outside `src/db/**` + `scripts/**`; `register()` runs `getEnv()` at server boot (missing env → boot fails with clear ZodError listing).

- [ ] **Step 1: ESLint fence**

Append to `eslint.config.mjs` (after the rules block):
```js
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
```

- [ ] **Step 2: Verify the fence bites, then clean**

Create a temp violation `src/lib/_fence-probe.ts`: `import { db } from "@/db/connection";` → `npm run lint` must FAIL with the no-restricted-imports message. Delete the probe → lint green.

- [ ] **Step 3: `src/instrumentation.ts`**

```ts
export async function register() {
  const { getEnv } = await import("@/lib/env");
  getEnv();
}
```
Verify: temporarily comment AUTH_SECRET in `.env`, run `npm run dev` → boot fails with ZodError listing AUTH_SECRET (not first-request). Restore `.env`. (Also `npm run build` still green — register only runs at runtime.)

- [ ] **Step 4: Gates + commit**

```bash
npm run lint && npm run typecheck && npm run build
git add -A && git commit -m "feat(security): db-fence lint rule + boot-time env validation"
```

---

### Task 6: Storage driver foundation

**Files:**
- Create: `src/modules/media/driver.ts`, `src/modules/media/drivers/local.ts`, `src/modules/media/drivers/r2.ts`, `tests/storage-driver.test.ts`

**Interfaces:**
- Produces: `interface StorageDriver { put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>; delete(key: string): Promise<void>; testConnection(): Promise<{ ok: boolean; error?: string }> }`, `getStorageDriver(setting: "local" | "r2"): StorageDriver`. Local writes under `process.env.STORAGE_LOCAL_DIR ?? "public/uploads"`; R2 driver v1 = `testConnection` only (HeadBucket via @aws-sdk/client-s3; put/delete throw "not implemented until Plan 3").

- [ ] **Step 1: Install + failing tests**

```bash
npm install @aws-sdk/client-s3
```

`tests/storage-driver.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStorageDriver } from "@/modules/media/driver";

describe("local storage driver", () => {
  it("puts and deletes files, returns public url", async () => {
    const dir = mkdtempSync(join(tmpdir(), "stor-"));
    process.env.STORAGE_LOCAL_DIR = dir;
    const driver = getStorageDriver("local");
    const { url } = await driver.put("a/b/test.txt", Buffer.from("hello"), "text/plain");
    expect(existsSync(join(dir, "a", "b", "test.txt"))).toBe(true);
    expect(readFileSync(join(dir, "a", "b", "test.txt"), "utf8")).toBe("hello");
    expect(url).toBe("/uploads/a/b/test.txt");
    await driver.delete("a/b/test.txt");
    expect(existsSync(join(dir, "a", "b", "test.txt"))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_DIR;
  });

  it("rejects path traversal keys", async () => {
    const driver = getStorageDriver("local");
    await expect(driver.put("../evil.txt", Buffer.from("x"), "text/plain")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: RED → implement**

```ts
// src/modules/media/driver.ts
import "server-only";
import type { StorageDriver } from "./driver-types";
import { LocalDriver } from "./drivers/local";
import { R2Driver } from "./drivers/r2";

export type { StorageDriver } from "./driver-types";

export function getStorageDriver(setting: "local" | "r2"): StorageDriver {
  return setting === "r2" ? new R2Driver() : new LocalDriver();
}
```

`src/modules/media/driver-types.ts` (plain, no server-only — shared type):
```ts
export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}
```

`src/modules/media/drivers/local.ts`:
```ts
import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageDriver } from "../driver-types";

export class LocalDriver implements StorageDriver {
  private root() {
    return resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "public/uploads");
  }

  private safe(key: string) {
    const full = resolve(this.root(), key);
    if (!full.startsWith(this.root() + "\\") && !full.startsWith(this.root() + "/")) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, data: Buffer, contentType: string) {
    void contentType;
    const full = this.safe(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
    return { url: `/uploads/${key.split("\\").join("/")}` };
  }

  async delete(key: string) {
    await unlink(this.safe(key));
  }

  async testConnection() {
    return { ok: true };
  }
}
```

`src/modules/media/drivers/r2.ts`:
```ts
import "server-only";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver } from "../driver-types";

export class R2Driver implements StorageDriver {
  async put(): Promise<{ url: string }> {
    throw new Error("R2 upload lands in Plan 3 (media module)");
  }
  async delete(): Promise<void> {
    throw new Error("R2 delete lands in Plan 3 (media module)");
  }

  async testConnection() {
    const id = process.env.R2_ACCOUNT_ID;
    const key = process.env.R2_ACCESS_KEY_ID;
    const secret = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    if (!id || !key || !secret || !bucket) {
      return { ok: false, error: "R2 credentials incomplete" };
    }
    try {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${id}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: key, secretAccessKey: secret },
      });
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
  }
}
```
Add `STORAGE_LOCAL_DIR` to `.env.example` future-section comments.

- [ ] **Step 3: GREEN + gates + commit**

```bash
npx vitest run tests/storage-driver.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(storage): driver interface + local driver + R2 connection test"
```

---

### Task 7: Email foundation

**Files:**
- Create: `src/modules/email/transport.ts`, `src/modules/email/send.ts`, `src/modules/email/templates/base.tsx`, `tests/email.test.ts`

**Interfaces:**
- Produces: `getSmtpTransport(): Transporter | null` (null when SMTP_HOST unset → no-op), `sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ sent: boolean }>` (sent=false + server log when unconfigured), `renderBaseEmail(opts): string` (react-email rendered to HTML string).

- [ ] **Step 1: Install + failing test**

```bash
npm install nodemailer react-email @react-email/components
npm install -D @types/nodemailer
```

`tests/email.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sendEmail } from "@/modules/email/send";

describe("sendEmail", () => {
  it("no-ops gracefully when SMTP is unconfigured", async () => {
    delete process.env.SMTP_HOST;
    const result = await sendEmail({ to: "x@y.com", subject: "T", html: "<p>T</p>" });
    expect(result.sent).toBe(false);
  });
});
```

- [ ] **Step 2: RED → implement**

`src/modules/email/transport.ts`:
```ts
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export function getSmtpTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export function buildTransportFromValues(values: {
  host: string; port: number; user?: string; pass?: string;
}): Transporter {
  return nodemailer.createTransport({
    host: values.host,
    port: values.port,
    secure: values.port === 465,
    auth: values.user ? { user: values.user, pass: values.pass } : undefined,
  });
}
```
(Critical: reads `process.env` at CALL time — the wizard's hot-reload works because of this. Do not route through `getEnv()`.)

`src/modules/email/send.ts`:
```ts
import "server-only";
import { getSmtpTransport } from "./transport";

export async function sendEmail(opts: {
  to: string; subject: string; html: string;
}): Promise<{ sent: boolean }> {
  const transport = getSmtpTransport();
  if (!transport) {
    console.info(`[email:no-op] ${opts.subject} → ${opts.to}`);
    return { sent: false };
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "TripMate <no-reply@localhost>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { sent: true };
}
```

`src/modules/email/templates/base.tsx` — minimal branded shell (token colors inline-styled since email CSS is isolated; plain, per UI spec §10):
```tsx
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

export function renderBaseEmail(opts: { heading: string; bodyHtml: string }): string {
  return renderToStaticMarkup(
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 560, margin: "0 auto", padding: 24 }}>
      <h2 style={{ color: "#0E5E5A" }}>{opts.heading}</h2>
      <div dangerouslySetInnerHTML={{ __html: opts.bodyHtml }} />
      <p style={{ color: "#888", fontSize: 12, marginTop: 32 }}>TripMate</p>
    </div>,
  );
}
```
(`dangerouslySetInnerHTML` here is allowed — email body builder runs server-side on our own templates; the global lint ban targets app pages. If the `react/no-danger` rule fires, wrap this file's usage with an eslint-disable-next-line comment and note it in the report.)

- [ ] **Step 3: GREEN + gates + commit**

```bash
npx vitest run tests/email.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(email): SMTP transport + send util with no-op fallback"
```

---

### Task 8: Setup wizard — server logic

**Files:**
- Create: `src/modules/settings/wizard.ts`, `src/modules/settings/wizard-actions.ts`, `tests/wizard-status.test.ts`

**Interfaces:**
- Produces: `getWizardStatus(): Promise<WizardStatus>` where
```ts
type WizardStatus = {
  setupComplete: boolean;
  envWritable: boolean;
  steps: {
    superadmin: { configured: boolean };
    site: { configured: boolean };
    storage: { configured: boolean; driver: "local" | "r2" | null; r2Ready: boolean };
    smtp: { configured: boolean };
    meta: { configured: boolean; skipped: boolean };
  };
};
```
Actions (all `'use server'`, all withGuard({public: true}) BUT internally re-verify `setupComplete === false` before any mutation): `wizardWriteEnv(values)`, `wizardTestSmtp(values): Promise<{ok, error?}>` (uses buildTransportFromValues directly — NEVER saves), `wizardTestR2(): Promise<{ok, error?}>`, `wizardCreateSuperadmin(input: {email, password, name})`, `wizardComplete()` (sets setup.setupComplete=true), `wizardRecheck(): Promise<WizardStatus>`.

- [ ] **Step 1: Failing tests `tests/wizard-status.test.ts`** (pure detection logic — extract `detectStepStatus(env, settings, userCount)` as a pure function so it's testable without DB):

```ts
import { describe, it, expect } from "vitest";
import { detectStepStatus } from "@/modules/settings/wizard";

describe("detectStepStatus", () => {
  const baseEnv = {} as Record<string, string | undefined>;

  it("storage configured when driver local", () => {
    const s = detectStepStatus({ ...baseEnv, STORAGE_DRIVER: "local" }, { storage: { driver: "local" } }, 0);
    expect(s.storage.configured).toBe(true);
    expect(s.storage.driver).toBe("local");
  });

  it("storage not configured when driver r2 but creds missing", () => {
    const s = detectStepStatus({ ...baseEnv, STORAGE_DRIVER: "r2" }, { storage: { driver: "r2" } }, 0);
    expect(s.storage.configured).toBe(false);
    expect(s.storage.r2Ready).toBe(false);
  });

  it("storage configured when r2 + full creds", () => {
    const env = { STORAGE_DRIVER: "r2", R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET_NAME: "d", R2_PUBLIC_URL: "https://x" };
    const s = detectStepStatus(env, { storage: { driver: "r2" } }, 0);
    expect(s.storage.configured).toBe(true);
    expect(s.storage.r2Ready).toBe(true);
  });

  it("smtp configured when host set", () => {
    expect(detectStepStatus({ SMTP_HOST: "s.x" }, {}, 0).smtp.configured).toBe(true);
    expect(detectStepStatus({}, {}, 0).smtp.configured).toBe(false);
  });

  it("meta configured with pixel, skipped flag from settings", () => {
    const s = detectStepStatus({ META_PIXEL_ID: "123" }, { meta: { skipped: true } }, 0);
    expect(s.meta.configured).toBe(true);
    expect(s.meta.skipped).toBe(true);
  });

  it("superadmin configured iff userCount > 0", () => {
    expect(detectStepStatus({}, {}, 1).superadmin.configured).toBe(true);
    expect(detectStepStatus({}, {}, 0).superadmin.configured).toBe(false);
  });
});
```

- [ ] **Step 2: RED → implement `wizard.ts`** — `detectStepStatus(env, settings, userCount)` pure (above semantics) + `getWizardStatus()` server fn that gathers: settings (site/storage/setup/meta via getSetting), userCount (`db.select count from users`), envWritable (isEnvWritable()).

- [ ] **Step 3: `wizard-actions.ts`**

```ts
"use server";
import { getSetting, setSetting } from "./service";
import { writeEnvValues } from "@/lib/env-file";
import { buildTransportFromValues } from "@/modules/email/transport";
import { R2Driver } from "@/modules/media/drivers/r2";
import { withGuard } from "@/lib/guard";
import { db } from "@/db/client";
import { users } from "@/modules/users/schema";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getWizardStatus } from "./wizard";

async function assertUnlocked() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) throw new Error("Setup already completed");
}

export const wizardWriteEnv = withGuard({ public: true }, async (values: Record<string, string>) => {
  await assertUnlocked();
  writeEnvValues(values);
  return { ok: true };
});

export const wizardTestSmtp = withGuard({ public: true, rateLimit: { limit: 5, windowMs: 60_000 } }, async (values: {
  host: string; port: number; user?: string; pass?: string; from?: string; to: string;
}) => {
  await assertUnlocked();
  try {
    const transport = buildTransportFromValues(values);
    await transport.sendMail({ from: values.from ?? values.user ?? "test@localhost", to: values.to, subject: "TripMate SMTP test", text: "SMTP configuration works." });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
});

export const wizardTestR2 = withGuard({ public: true, rateLimit: { limit: 5, windowMs: 60_000 } }, async () => {
  await assertUnlocked();
  return new R2Driver().testConnection();
});

export const wizardCreateSuperadmin = withGuard(
  { public: true, rateLimit: { limit: 3, windowMs: 60_000 } },
  async (input: { email: string; password: string; name: string }) => {
    await assertUnlocked();
    const email = input.email.trim().toLowerCase();
    await auth.api.createUser({
      body: { email, password: input.password, name: input.name, role: "superadmin" },
    });
    return { ok: true };
  },
);

export const wizardComplete = withGuard({ public: true }, async () => {
  await assertUnlocked();
  await setSetting("setup", { setupComplete: true });
  return { ok: true };
});

export const wizardRecheck = withGuard({ public: true }, async () => getWizardStatus());
```
(If `auth.api.createUser` needs different args in the installed version — e.g. `database` adapter direct insert — adapt: the requirement is superadmin row in users with role superadmin + a password credential that can log in. Verify by signing in during Task 12 e2e.)

- [ ] **Step 4: GREEN + gates + commit**

```bash
npx vitest run tests/wizard-status.test.ts && npm run typecheck && npm run lint
git add -A && git commit -m "feat(wizard): status detection + guarded env/test/superadmin actions"
```

---

### Task 9: Setup wizard — UI

**Files:**
- Create: `src/app/setup/page.tsx` (server), `src/app/setup/SetupWizard.tsx` (client)
- Follow UI design system spec §5 admin patterns + `ui-ux-pro-max` guidelines: stepper, quiet cards, form patterns (react-hook-form + shadcn Form), h-11 inputs, focus states from Task 3 tokens.

**Interfaces:**
- Produces: `/setup` — locked (redirect `/`) when setupComplete. Otherwise renders stepper with per-step state chips (✓ configured / needs config), password-type inputs (never prefilled), copy-blocks for missing env keys when `!envWritable`, Re-check button, test buttons (SMTP/R2), complete → success screen → redirect `/login`.

- [ ] **Step 1: Server page**

```tsx
// src/app/setup/page.tsx
import { redirect } from "next/navigation";
import { getWizardStatus } from "@/modules/settings/wizard";
import { getSetting } from "@/modules/settings/service";
import SetupWizard from "./SetupWizard";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) redirect("/");
  const status = await getWizardStatus();
  const site = await getSetting("site");
  return <SetupWizard initialStatus={status} initialSite={site} />;
}
```

- [ ] **Step 2: Client wizard component** — requirements (implement as ONE focused component + small per-step subcomponents in the same file, ~350-450 lines):
  - Vertical stepper: Account → Site → Storage → SMTP → Meta → Done
  - Account step: if `steps.superadmin.configured` show ✓ chip, else email+name+password form (min 10 chars, zod) → `wizardCreateSuperadmin` → auto-advance
  - Site step: name/logo-url/favicon-url form → `setSetting` action (add a tiny guarded `wizardSetSetting` to wizard-actions: withGuard({public:true}, ...) + assertUnlocked) → advance
  - Storage step: radio local|r2 (default local). local → set setting + advance. r2 → 5 credential fields (password-type for secret key) → if envWritable: `wizardWriteEnv` + `wizardTestR2`; else copy-block listing `R2_ACCOUNT_ID=...` etc. + "added, re-check" → `wizardRecheck` until r2Ready
  - SMTP step: host/port/user/pass/from fields; "Send test email" (asks for a destination address) → `wizardTestSmtp` → result inline; save → `wizardWriteEnv` (if writable) or copy-block + re-check
  - Meta step: Pixel ID + "skip" → save via env/copy-block + setting `meta: {skipped}`; CAPI token field password-type
  - Done: `wizardComplete` → success card → link to `/login`
  - `!envWritable` banner on env-dependent steps: "This platform's env is managed externally (Vercel/Portainer). Add the keys below, then Re-check."
  - ALL password-type fields never repopulate; after any save the component refetches status (server actions return fresh status)
  - Rate-limit errors surface as inline destructive text

- [ ] **Step 3: Visual + functional verify (browser)**

`npm run dev` → http://localhost:3000/setup — full manual pass: stepper renders, storage local path advances, SMTP test against fake host shows error state, account creation works, complete locks (second visit redirects `/`). Use the `ui-ux-pro-max` skill to sanity-check the wizard's visual hierarchy before committing.

- [ ] **Step 4: e2e spec `tests/e2e/setup.spec.ts`** (serial, runs FIRST in the suite — see Task 13 ordering note):

```ts
import { test, expect } from "@playwright/test";

test.describe.serial("setup wizard", () => {
  test("completes and locks", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: /setup/i })).toBeVisible();
    // account
    await page.getByLabel(/email/i).fill("admin@tripmate.test");
    await page.getByLabel(/password/i).fill("supersecret123");
    await page.getByLabel(/name/i).fill("Super Admin");
    await page.getByRole("button", { name: /create|continue/i }).click();
    // storage: local default → advance
    await page.getByRole("button", { name: /continue|next|save/i }).click();
    // smtp: skip via continue (no test send)
    await page.getByRole("button", { name: /continue|next|save|skip/i }).click();
    // meta: skip
    await page.getByRole("button", { name: /skip/i }).click();
    // complete
    await page.getByRole("button", { name: /finish|complete/i }).click();
    await expect(page.getByText(/login/i)).toBeVisible();
    // locked now
    await page.goto("/setup");
    await expect(page).not.toHaveURL(/setup/);
  });
});
```
(Adjust selectors to the implemented UI — the contract is: full pass completes, route locks. This test MUTATES the dev DB (creates superadmin admin@tripmate.test, sets setupComplete) — Task 13's auth specs rely on exactly this state, which is why setup.spec runs first.)

- [ ] **Step 5: Gates + commit**

```bash
npx playwright test tests/e2e/setup.spec.ts && npm run lint && npm run typecheck
git add -A && git commit -m "feat(wizard): multi-step setup UI with env detection + copy-blocks"
```

---

### Task 10: Auth pages (login/logout)

**Files:**
- Create: `src/app/(auth)/login/page.tsx` (server shell), `src/app/(auth)/login/LoginForm.tsx` (client), `src/lib/auth-actions.ts` ('use server' signOut)
- Create: `src/lib/auth-client.ts` (`createAuthClient` for client components)

**Interfaces:**
- Produces: `/login` — email+password, error surface ("invalid credentials" uniform — no user-existence leak), redirect on success (admin → `/admin`, others → `/account`), sign-out server action `signOutAction`.

- [ ] **Step 1: Client + actions**

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

```ts
// src/lib/auth-actions.ts
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
```

`LoginForm.tsx` — email/password react-hook-form + zod, `await authClient.signIn.email({ email, password })`, on error set uniform message, on success `window.location.href = "/account"` (server layout routes role appropriately; simple hard nav avoids RSC cache issues). Include "password must be 10+" only on REGISTER-type copy — login shows no hints.

- [ ] **Step 2: Page shell + e2e `tests/e2e/auth.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("login rejects wrong credentials with uniform error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@tripmate.test");
  await page.getByLabel(/password/i).fill("wrongpassword1");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page.getByText(/invalid/i)).toBeVisible();
});

test("login succeeds and lands on admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@tripmate.test");
  await page.getByLabel(/password/i).fill("supersecret123");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/admin|account/);
});
```

- [ ] **Step 3: Gates + commit**

```bash
npx playwright test tests/e2e/auth.spec.ts && npm run lint && npm run typecheck
git add -A && git commit -m "feat(auth): login page + sign-out action + e2e"
```

---

### Task 11: Admin shell

**Files:**
- Create: `src/app/admin/layout.tsx` (server-gated), `src/app/admin/AdminShell.tsx` (client: sidebar + header), `src/app/admin/page.tsx` (placeholder dashboard), `src/lib/admin-menu.ts` (permission→items map)
- Add shadcn sidebar + dependencies: `npx shadcn@latest add sidebar` (re-adds ui/sidebar + use-mobile usage)

**Interfaces:**
- Produces: `/admin/*` — server layout calls `requireRole("superadmin", "admin", "staff")`; menu items filtered by permission; customer hitting `/admin` → redirect `/`. `ADMIN_MENU` exported for reuse.

- [ ] **Step 1: Menu map `src/lib/admin-menu.ts`**

```ts
import type { Permission } from "@/modules/users/permissions";

export const ADMIN_MENU: {
  href: string; label: string; icon: string; permission: Permission;
}[] = [
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard", permission: "orders.view" },
  { href: "/admin/leads", label: "Leads", icon: "mail", permission: "leads.view" },
  { href: "/admin/orders", label: "Orders", icon: "book-copy", permission: "orders.view" },
  { href: "/admin/payments", label: "Payments", icon: "banknote", permission: "payments.verify" },
  { href: "/admin/expenses", label: "Expenses", icon: "receipt", permission: "expenses.submit" },
  { href: "/admin/catalog", label: "Catalog", icon: "package", permission: "catalog.manage" },
  { href: "/admin/content", label: "Content", icon: "file-text", permission: "content.manage" },
  { href: "/admin/landing-pages", label: "Landing Pages", icon: "megaphone", permission: "content.manage" },
  { href: "/admin/media", label: "Media", icon: "image", permission: "media.manage" },
  { href: "/admin/users", label: "Users", icon: "users", permission: "users.manage" },
  { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings.manage" },
];
```
(Links to not-yet-built routes are fine — pages arrive in Plans 3-6; clicking them 404s until then. Placeholder pages NOT created for future modules — only the dashboard.)

- [ ] **Step 2: Layout + shell**

```tsx
// src/app/admin/layout.tsx
import { requireRole } from "@/lib/auth-helpers";
import { ADMIN_MENU } from "@/lib/admin-menu";
import { hasPermission } from "@/modules/users/permissions";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("superadmin", "admin", "staff");
  const menu = ADMIN_MENU.filter((item) =>
    hasPermission(session.user.role, null, item.permission),
  );
  return (
    <AdminShell
      menu={menu}
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
    >
      {children}
    </AdminShell>
  );
}
```

`AdminShell.tsx` — client: shadcn SidebarProvider/Sidebar/SidebarInset pattern (follow the shadcn sidebar docs example for structure), menu items render only what the server passed (client does NO permission logic), header with user dropdown (name, role chip, "View site" link, sign-out via `signOutAction`), `p-6` main. Dashboard page: `<h1>Dashboard</h1><p className="text-muted-foreground">Real KPIs arrive in Plan 6.</p>` + menu-count summary card.

- [ ] **Step 3: e2e `tests/e2e/admin.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("admin loads with menu for superadmin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("admin@tripmate.test");
  await page.getByLabel(/password/i).fill("supersecret123");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Users")).toBeVisible(); // superadmin sees Users
});

test("anon redirected from /admin to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/login/);
});
```

- [ ] **Step 4: Gates + commit**

```bash
npx playwright test tests/e2e/admin.spec.ts && npm run lint && npm run typecheck
git add -A && git commit -m "feat(admin): server-gated shell + permission-filtered menu"
```

---

### Task 12: Account placeholder

**Files:**
- Create: `src/app/account/layout.tsx`, `src/app/account/page.tsx`

- [ ] **Step 1: Layout (server-gated any session) + placeholder page** — layout: `requireSession()` + minimal header (site title, sign-out). Page: `<h1>My Account</h1>` + "Customer portal arrives in Plan 5."

- [ ] **Step 2: e2e** (append to admin.spec.ts): logged-out `/account` → `/login` redirect; logged-in → heading visible.

- [ ] **Step 3: Gates + commit**

```bash
npx playwright test && npm run lint && npm run typecheck && npm run build
git add -A && git commit -m "feat(account): session-gated portal placeholder"
```

---

### Task 13: Playwright ordering + full suite green

**Files:**
- Modify: `playwright.config.ts` — testMatch ordering so `setup.spec.ts` runs first (name-based default is alphabetical: `admin` < `auth` < `setup` — WRONG order). Fix: `projects[0].testMatch` pattern split, or simplest: rename setup spec to `tests/e2e/00-setup.spec.ts` and keep default ordering.

- [ ] **Step 1: Rename** `tests/e2e/setup.spec.ts` → `tests/e2e/00-setup.spec.ts` (leading zeros sort first).

- [ ] **Step 2: Idempotency guard** — wrap 00-setup's body: if `/setup` already redirects (previous run completed setup), skip the suite gracefully:
```ts
test.beforeEach(async ({ page }) => {
  await page.goto("/setup");
});
test("already configured → wizard locked, suite continues", async ({ page }) => {
  if (page.url().includes("/login") || !page.url().includes("/setup")) {
    test.skip(true, "setup already complete");
  }
});
```
Then the serial complete-and-lock test runs only when still unlocked. Full `npx playwright test` twice in a row must stay green (second run skips setup, auth/admin specs still pass against the persisted admin@tripmate.test user).

- [ ] **Step 3: Full gate + commit**

```bash
npm run lint && npm run typecheck && npm run build && npm run test && npm run test:e2e && npm run test:e2e
git add -A && git commit -m "test: deterministic e2e ordering + idempotent setup spec"
```

---

### Task 14: Docs + final gate

**Files:**
- Modify: `README.md` (auth env vars + wizard mention), `.env.example` (AUTH_SECRET required + SMTP/storage sections already there — verify)

- [ ] **Step 1: README** — under Getting started, after db:seed add: "5. `npm run dev` → open http://localhost:3000/setup — the wizard creates your superadmin and configures storage/SMTP (writes `.env` locally; on Vercel/Portainer it shows copy-paste env blocks)". Commands unchanged.

- [ ] **Step 2: Final full gate** — `npm run lint && npm run typecheck && npm run build && npm run test && npm run test:e2e` — all green, pristine.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: setup wizard onboarding in README — plan 2 complete"
```

---

## Verification Checklist (plan-level acceptance)

- [ ] `@/db/connection` import outside src/db/scripts → lint FAILS (fence verified by probe)
- [ ] Missing env var → `next dev`/`next start` fails AT BOOT (verified by temporary .env break)
- [ ] Setup wizard completes on fresh state; second visit redirects; e2e idempotent across two runs
- [ ] Saved SMTP/R2/AUTH values never appear in any response — grep the wizard action return types: booleans/ok-error only
- [ ] `.env` write is atomic (tmp+rename), whitelist-enforced, DATABASE_URL not writable
- [ ] Login works for superadmin; wrong password = uniform error; customer role cannot reach /admin
- [ ] Admin menu items match permissions (staff lacks Users/Settings entries)
- [ ] sendEmail no-ops cleanly with no SMTP_HOST
- [ ] Full gate green
