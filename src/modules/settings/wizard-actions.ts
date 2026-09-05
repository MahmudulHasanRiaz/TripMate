"use server";

/**
 * Setup wizard — guarded server actions.
 *
 * All actions are `withGuard({ public: true })` — the wizard is reached before
 * any account exists, so nothing can require a session. The REAL lock is
 * `assertUnlocked()`, which runs FIRST in every mutating action: once
 * `setup.setupComplete` is true the entire surface is inert, so a wizard that
 * finished can never be re-entered through these endpoints.
 *
 * No action ever returns a stored secret — responses carry `{ ok }` /
 * `{ ok, error }` (or the step booleans from getWizardStatus) only.
 */

import { getSetting, setSetting } from "./service";
import { writeEnvValues } from "@/lib/env-file";
import { buildTransportFromValues } from "@/modules/email/transport";
import { R2Driver } from "@/modules/media/drivers/r2";
import { withGuard } from "@/lib/guard";
import { db } from "@/db/client";
import { users } from "@/modules/users/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getWizardStatus } from "./wizard";

const WIZARD_SETTING_KEYS = ["site", "storage", "meta"] as const;

/** Gate: every mutating wizard action dies once setup has been completed. */
async function assertUnlocked() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) throw new Error("Setup already completed");
}

/** Persist one wizard-owned settings row (site / storage / meta). */
export const wizardSetSetting = withGuard(
  { public: true },
  async (input: { key: string; value: Record<string, unknown> }) => {
    await assertUnlocked();
    if (!(WIZARD_SETTING_KEYS as readonly string[]).includes(input.key)) {
      throw new Error(`Setting key ${input.key} is not writable via the wizard`);
    }
    await setSetting(input.key, input.value);
    return { ok: true };
  },
);

/**
 * Apply whitelisted KEY=VALUE pairs to .env (see ENV_WRITABLE_KEYS for the
 * allow-list — DATABASE_URL/APP_URL/AUTH_SECRET are intentionally excluded, so
 * a wizard call can never redirect the app's own connection string). Values are
 * hot-reloaded into process.env for call-time readers (SMTP/R2).
 */
export const wizardWriteEnv = withGuard(
  { public: true },
  async (values: Record<string, string>) => {
    await assertUnlocked();
    writeEnvValues(values);
    return { ok: true };
  },
);

/**
 * SMTP probe: builds a transport from the submitted values and sends a real
 * test mail — values are NEVER persisted here.
 */
export const wizardTestSmtp = withGuard(
  { public: true, rateLimit: { limit: 5, windowMs: 60_000 } },
  async (values: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from?: string;
    to: string;
  }) => {
    await assertUnlocked();
    try {
      const transport = buildTransportFromValues(values);
      await transport.sendMail({
        from: values.from ?? values.user ?? "test@localhost",
        to: values.to,
        subject: "TripMate SMTP test",
        text: "SMTP configuration works.",
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
    }
  },
);

/**
 * R2 probe: real HeadBucket against the R2 creds currently in process.env
 * (i.e. just-written by wizardWriteEnv, or platform-injected on the next
 * request when env is external). Never persists anything.
 */
export const wizardTestR2 = withGuard(
  { public: true, rateLimit: { limit: 5, windowMs: 60_000 } },
  async () => {
    await assertUnlocked();
    return new R2Driver().testConnection();
  },
);

/**
 * Create the superadmin + a password credential that can sign in through
 * /login later.
 *
 * Path (verified against installed better-auth 1.7.2): `createUser` is only
 * exposed by the OPTIONAL admin plugin, which this app does not install — and
 * `role` is an `input: false` additionalField anyway, so it could not be set
 * through the public body. Instead we use `auth.api.signUpEmail` (the
 * email+password plugin IS enabled) to create the user + hashed password
 * credential through better-auth itself, then escalate the row's role to
 * superadmin server-side. Escalation inside a setup-unlocked action is
 * legitimate: the wizard owns the first account by design.
 *
 * Idempotent: if a row for the email already exists (e.g. a prior attempt where
 * signup landed but the escalation step failed), we escalate instead of
 * erroring on a duplicate — the retry converges to a working superadmin.
 */
export const wizardCreateSuperadmin = withGuard(
  { public: true, rateLimit: { limit: 3, windowMs: 60_000 } },
  async (input: { email: string; password: string; name: string }) => {
    await assertUnlocked();
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    try {
      const existing = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing[0]) {
        if (existing[0].role === "superadmin") return { ok: true };
        // Stray account from a failed earlier run — promote it now.
        await db
          .update(users)
          .set({ role: "superadmin" })
          .where(eq(users.id, existing[0].id));
        return { ok: true };
      }

      await auth.api.signUpEmail({
        body: { email, password: input.password, name },
      });
      await db
        .update(users)
        .set({ role: "superadmin" })
        .where(eq(users.email, email));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Account creation failed" };
    }
  },
);

/** Finish setup: persists setupComplete=true, locking every wizard action. */
export const wizardComplete = withGuard({ public: true }, async () => {
  await assertUnlocked();
  await setSetting("setup", { setupComplete: true });
  return { ok: true };
});

/** Re-run status detection (used after external env edits on Vercel etc). */
export const wizardRecheck = withGuard({ public: true }, async () =>
  getWizardStatus(),
);
