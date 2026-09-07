"use server";

/**
 * Site/home settings — guarded server actions (the admin settings page's saves).
 *
 * Each action is withGuard({ permission: "settings.manage" }) + a zod
 * .safeParse boundary (parsed.data only — raw input never reaches the service)
 * + a GuardError relay, so the client gets { ok:true } / { ok:false, code,
 * error } and never depends on Next's error serialization.
 *
 * CACHE (plan-6 carry-over: EVERY settings mutation expires the settings tag —
 * today the wizard does it but a plain setSetting path could go stale):
 * updateTag(CACHE_TAGS.settings) runs after every successful write. It lives
 * HERE, not in the service — updateTag throws outside a Server Action request
 * (scripts/tests reuse the service fns), the same actions-layer contract as
 * modules/{leads,bookings,payments,expenses}. The tag covers every cached
 * public reader: lib/site-settings.ts (header/footer chrome),
 * getPublicSiteSettings (public metadata) and the cached home page hero.
 *
 * The plain READ service functions (getSiteSettings, getHomeSettings,
 * getPublicSiteSettings) are deliberately NOT re-exported from this 'use
 * server' file: re-exporting an async service fn here would expose it as an
 * unguarded client-callable server action. Admin server components import them
 * directly from site-settings.ts (server-only) and carry their own route-level
 * guard — the same split every other module uses.
 */

import { updateTag } from "next/cache";
import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { homeSettingsInputSchema, siteSettingsInputSchema } from "./site-settings-validation";
import { updateHomeSettings, updateSiteSettings } from "./site-settings";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; code: string; error: string };

/**
 * Guard + relay wrapper for both actions: withGuard({ permission }) +
 * GuardError → { ok:false, code, error }. Anything else re-throws to the global
 * error boundary (the payments/expenses actions contract, with the code field
 * the plan-6 settings UI expects).
 */
function settingsAction<TInput>(
  guardOpts: { permission: string },
  run: (input: TInput, session: Session | null) => Promise<SettingsActionResult>,
): (input: TInput) => Promise<SettingsActionResult> {
  const guarded = withGuard(guardOpts, run);
  return async (input: TInput): Promise<SettingsActionResult> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, code: e.code, error: e.message };
      }
      throw e;
    }
  };
}

/** First failing zod issue rendered as "path: message" for the UI. */
function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".") ?? "";
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

/** Save the site identity (brand, contact, searchEngineVisibility, footer). */
export const saveSiteSettingsAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = siteSettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    await updateSiteSettings(parsed.data);
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

/** Save the home hero copy (headline, sub, image, CTA label/link, alt text). */
export const saveHomeSettingsAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = homeSettingsInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    await updateHomeSettings(parsed.data);
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);
