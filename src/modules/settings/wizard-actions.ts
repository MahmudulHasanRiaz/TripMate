"use server";

/**
 * Setup wizard — guarded server actions.
 *
 * All actions are `withGuard({ public: true })` — the wizard is reached before
 * any account exists, so nothing can require a session. Two locks close over
 * the surface:
 *  1. `assertUnlocked()` runs FIRST in every mutating action: once
 *     `setup.setupComplete` is true the whole surface is inert, so a finished
 *     wizard can never be re-entered through these endpoints.
 *  2. `wizardCreateSuperadmin` additionally refuses once ANY superadmin row
 *     exists — spec §12 keeps the create-superadmin endpoint legitimate only
 *     while no superadmin does, so a second operator can't mint an extra
 *     superadmin during the window before setup completes.
 *
 * Residual window (documented; owned by Plan 8's SETUP_TOKEN hardening): the
 * flow actions (`wizardWriteEnv` / `wizardSetSetting` / `wizardComplete`) stay
 * available between superadmin creation and `wizardComplete` — the operator
 * needs them to finish steps 2–6 — so env writes remain open until setup is
 * completed, not merely until a superadmin exists. The /setup route already
 * redirects away on setupComplete, and these are the only pre-complete write
 * paths.
 *
 * No action ever returns a stored secret — responses carry `{ ok }` /
 * `{ ok, error }` (or the step booleans from getWizardStatus) only.
 */

import { updateTag } from "next/cache";
import { getSetting, setSetting } from "./service";
import { writeEnvValues } from "@/lib/env-file";
import { buildTransportFromValues } from "@/modules/email/transport";
import { R2Driver } from "@/modules/media/drivers/r2";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { withGuard, GuardError } from "@/lib/guard";
import { db } from "@/db/client";
import { users } from "@/modules/users/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getWizardStatus } from "./wizard";
import { seedDemoData } from "@/db/demo-seeder";
import { seedProductionBaseline } from "@/db/production-seeder";

const WIZARD_SETTING_KEYS = ["site", "storage", "meta"] as const;

/** Gate: every mutating wizard action dies once setup has been completed. */
async function assertUnlocked() {
  const setup = await getSetting("setup");
  if (setup?.setupComplete) throw new Error("Setup already completed");
}

/**
 * Promote a user row to superadmin and VERIFY the write landed. The verify step
 * is what stops a silent false-success: if the update matched nothing (wrong
 * id, drifted state) we throw instead of reporting { ok: true }.
 */
async function escalateToSuperadmin(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ role: "superadmin" })
    .where(eq(users.id, userId));
  const row = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (row[0]?.role !== "superadmin") {
    throw new Error("Failed to set superadmin role");
  }
}

/**
 * Relay thrown GuardError codes into the action's return payload so the client
 * never depends on Next's error-serialization (which may mask the original
 * message/code in production). Every wizard action returns an `{ ok }` shape,
 * so a rate-limit rejection arrives as a plain `{ ok:false, error:"RATE_LIMITED" }`
 * the UI maps to friendly copy.
 */
function relay<TInput, TOut extends { ok: boolean }>(
  action: (input: TInput, rateKey?: string) => Promise<TOut>,
) {
  return async (input: TInput, rateKey?: string): Promise<TOut> => {
    try {
      return await action(input, rateKey);
    } catch (e) {
      if (e instanceof GuardError) {
        if (e.code === "RATE_LIMITED") {
          return { ok: false, error: "RATE_LIMITED" } as unknown as TOut;
        }
        if (e.code === "UNAUTHORIZED") {
          return { ok: false, error: "UNAUTHORIZED" } as unknown as TOut;
        }
      }
      throw e;
    }
  };
}

/** Persist one wizard-owned settings row (site / storage / meta). */
export const wizardSetSetting = relay(
  withGuard(
    { public: true },
    async (input: { key: string; value: Record<string, unknown> }) => {
      await assertUnlocked();
      if (!(WIZARD_SETTING_KEYS as readonly string[]).includes(input.key)) {
        throw new Error(`Setting key ${input.key} is not writable via the wizard`);
      }
      await setSetting(input.key, input.value);
      // Public chrome (header/footer/home) caches reads on CACHE_TAGS.settings
      // (see lib/site-settings.ts + the home page) but nothing on the wizard's
      // write path ever invalidated it — so brand/contact went stale after setup
      // on a fresh deploy. updateTag is the server-action read-your-own-writes
      // form. PLAN 6 NOTE: the settings admin page MUST do the same on every
      // settings save (site/home/storage/meta writes all expire this tag).
      updateTag(CACHE_TAGS.settings);
      return { ok: true };
    },
  ),
);

/**
 * Apply whitelisted KEY=VALUE pairs to .env (see ENV_WRITABLE_KEYS for the
 * allow-list — DATABASE_URL/APP_URL/AUTH_SECRET are intentionally excluded, so
 * a wizard call can never redirect the app's own connection string). Values are
 * hot-reloaded into process.env for call-time readers (SMTP/R2).
 */
export const wizardWriteEnv = relay(
  withGuard(
    { public: true },
    async (values: Record<string, string>) => {
      await assertUnlocked();
      writeEnvValues(values);
      return { ok: true };
    },
  ),
);

/**
 * SMTP probe: builds a transport from the submitted values and sends a real
 * test mail — values are NEVER persisted here.
 */
export const wizardTestSmtp = relay(
  withGuard(
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
  ),
);

/**
 * R2 probe: real HeadBucket against the R2 creds currently in process.env
 * (i.e. just-written by wizardWriteEnv, or platform-injected on the next
 * request when env is external). Never persists anything.
 */
const r2Probe = relay(
  withGuard(
    { public: true, rateLimit: { limit: 5, windowMs: 60_000 } },
    async () => {
      await assertUnlocked();
      return new R2Driver().testConnection();
    },
  ),
);
/** No-input alias so callers see a zero-arg action, not the guard's `input` slot. */
export const wizardTestR2 = async () => r2Probe(undefined);

/**
 * Create the superadmin + a password credential that can sign in through
 * /login later.
 *
 * Spec §12 gate: this endpoint is legitimate only while NO superadmin exists.
 * Before touching anything it queries for an existing `superadmin` row and
 * refuses (`{ ok:false, error:"A superadmin already exists." }`) if one is
 * found — closing the race where a second operator (or attacker) could mint an
 * extra superadmin while steps 2–6 are still open. As a consequence the
 * stray-customer promote path below only ever runs when no superadmin exists.
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
 * Error contract (verified): a headless `auth.api.signUpEmail({ body })` call
 * runs with `asResponse: false`, so a handler APIError (duplicate email, weak
 * password) is RE-THROWN — the promise rejects. We keep the try/catch for that
 * path AND defensively inspect the resolved result for a truthy `error`
 * property (some fetch-style wrapper layers resolve `{ error }` instead of
 * throwing) — if present we fail WITHOUT touching roles. Success resolves
 * `{ token, user }` where `user.id` is always present, so the role escalation
 * keys off the created user's id (not the email) and is VERIFIED before
 * returning — no silent false `{ ok: true }`.
 *
 * Idempotent: if a row for the email already exists (e.g. a prior attempt where
 * signup landed but the escalation step failed), we escalate instead of
 * erroring on a duplicate — the retry converges to a working superadmin.
 */
export const wizardCreateSuperadmin = relay(
  withGuard(
    { public: true, rateLimit: { limit: 3, windowMs: 60_000 } },
    async (input: { email: string; password: string; name: string }) => {
      await assertUnlocked();
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      try {
        // Spec §12: refuse as soon as a superadmin exists ANYWHERE — the create
        // endpoint is legitimate only while none does. (assertUnlocked keeps the
        // setup-complete lock separate; this guards the pre-complete window.)
        const superadminExists = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "superadmin"))
          .limit(1);
        if (superadminExists[0]) {
          return { ok: false, error: "A superadmin already exists." };
        }

        const existing = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing[0]) {
          if (existing[0].role === "superadmin") return { ok: true };
          // Stray account from a failed earlier run — promote it now.
          await escalateToSuperadmin(existing[0].id);
          return { ok: true };
        }

        const created = (await auth.api.signUpEmail({
          body: { email, password: input.password, name },
        })) as unknown as
          | { user?: { id?: string } }
          | { error?: string | { message?: string } };

        if ("error" in created && created.error) {
          const message =
            typeof created.error === "string"
              ? created.error
              : created.error.message ?? "Account creation failed";
          return { ok: false, error: message };
        }

        const createdUserId = "user" in created ? created.user?.id : undefined;
        if (!createdUserId) {
          throw new Error("User created but no id returned for role escalation");
        }
        await escalateToSuperadmin(createdUserId);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Account creation failed" };
      }
    },
  ),
);

/** Run seed for chosen installation mode (demo vs production) during setup wizard */
export const wizardSeedData = relay(
  withGuard(
    { public: true },
    async (input: { mode: "demo" | "production" }) => {
      await assertUnlocked();
      if (input.mode === "demo") {
        await seedDemoData();
      } else {
        await seedProductionBaseline();
      }
      updateTag(CACHE_TAGS.settings);
      return { ok: true };
    },
  ),
);

/** Finish setup: persists setupComplete=true, locking every wizard action. */
const completeSetup = relay(
  withGuard({ public: true }, async () => {
    await assertUnlocked();
    await setSetting("setup", { setupComplete: true });
    // The setup row itself isn't read by public chrome, but completing the
    // wizard is the final settings mutation of the onboarding flow — expire the
    // settings tag so any public read that raced the wizard's site/meta writes
    // is not served stale on the first visitor (same contract as the per-key
    // updateTag in wizardSetSetting above).
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  }),
);
export const wizardComplete = async (input?: { mode?: "demo" | "production" }) => completeSetup(input);

/** Re-run status detection (used after external env edits on Vercel etc). */
const recheckStatus = withGuard({ public: true }, async () => getWizardStatus());
/** No-input alias so callers see a zero-arg action, not the guard's `input` slot. */
export const wizardRecheck = async () => recheckStatus(undefined);

