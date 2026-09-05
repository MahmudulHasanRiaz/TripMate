import "server-only";
import { isEnvWritable } from "@/lib/env-file";
import { count } from "drizzle-orm";
import { users } from "@/modules/users/schema";

/**
 * Setup wizard — server side.
 *
 * `detectStepStatus` is a PURE function (env + settings + userCount in, step
 * booleans out) so the unit suite can exercise every detection branch without a
 * database. `getWizardStatus` wires it to the live store: the settings rows
 * (`site`/`storage`/`setup`/`meta`), the user count, and `isEnvWritable()`.
 *
 * NOTE on import discipline: `src/db/connection.ts` evaluates
 * `postgres(getEnv().DATABASE_URL)` at MODULE LOAD (boot env is validated
 * before the app runs), so any module that statically reaches the db client
 * cannot be imported by a vitest unit test. `detectStepStatus` must stay
 * importable, therefore the db-bound dependencies (`service`, `db/client`) are
 * loaded lazily inside `getWizardStatus` only. `isEnvWritable`/`count`/`users`
 * touch no connection and are imported eagerly.
 *
 * The Meta CAPI token (`META_CAPI_ACCESS_TOKEN`) is intentionally NOT a
 * detection input: its presence/absence is irrelevant to whether the meta step
 * is "done" (that is decided by the pixel id being set or the step being
 * skipped). This keeps private values out of the status response entirely.
 */

const R2_REQUIRED_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export type WizardSteps = {
  superadmin: { configured: boolean };
  site: { configured: boolean };
  storage: {
    configured: boolean;
    driver: "local" | "r2" | null;
    r2Ready: boolean;
  };
  smtp: { configured: boolean };
  meta: { configured: boolean; skipped: boolean };
};

export type WizardStatus = {
  setupComplete: boolean;
  envWritable: boolean;
  steps: WizardSteps;
};

/** Loose store shape accepted by detectStepStatus. Every field is optional so a
 * caller (or test) can pass whatever subset of the settings it has. */
export type WizardSettings = {
  setup?: { setupComplete?: boolean } | null;
  site?: unknown;
  storage?: { driver?: "local" | "r2" } | null;
  meta?: { skipped?: boolean } | null;
};

/**
 * Pure per-step detection. Only boolean presence is ever reported — never a
 * saved private value (SMTP_PASS, R2 secret, etc.).
 *
 * Rules (from the architecture spec):
 * - superadmin configured  ⇔  userCount > 0
 * - site configured        ⇔  a `site` settings row exists
 * - storage configured     ⇔  local driver, OR r2 driver with all 5 R2 env keys
 * - smtp configured        ⇔  SMTP_HOST present in env
 * - meta configured        ⇔  META_PIXEL_ID present; `skipped` echoes the meta
 *                             settings row (skip is a UI-level "done")
 */
export function detectStepStatus(
  env: Record<string, string | undefined>,
  settings: WizardSettings,
  userCount: number,
): WizardSteps {
  const driver =
    settings.storage?.driver ??
    (env.STORAGE_DRIVER === "local" || env.STORAGE_DRIVER === "r2"
      ? env.STORAGE_DRIVER
      : null);

  const r2Ready = R2_REQUIRED_ENV_KEYS.every((key) => Boolean(env[key]?.trim()));

  return {
    superadmin: { configured: userCount > 0 },
    site: { configured: Boolean(settings.site) },
    storage: {
      configured: driver === "local" ? true : driver === "r2" ? r2Ready : false,
      driver,
      r2Ready,
    },
    smtp: { configured: Boolean(env.SMTP_HOST?.trim()) },
    meta: {
      configured: Boolean(env.META_PIXEL_ID?.trim()),
      skipped: settings.meta?.skipped === true,
    },
  };
}

/** Assemble the full wizard status from the live store. Server-only. */
export async function getWizardStatus(): Promise<WizardStatus> {
  // Lazy — see the module note: service reaches db/client, whose connection
  // module evaluates getEnv() at import time.
  const { getSetting } = await import("@/modules/settings/service");
  const { db } = await import("@/db/client");

  const [setup, site, storage, meta] = await Promise.all([
    getSetting("setup"),
    getSetting("site"),
    getSetting("storage"),
    getSetting("meta"),
  ]);

  const rows = await db.select({ value: count() }).from(users);
  const userCount = rows[0]?.value ?? 0;

  return {
    setupComplete: setup?.setupComplete === true,
    envWritable: isEnvWritable(),
    steps: detectStepStatus(
      process.env as Record<string, string | undefined>,
      { setup, site, storage, meta },
      userCount,
    ),
  };
}
