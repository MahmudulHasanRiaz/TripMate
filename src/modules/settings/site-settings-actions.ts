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
import { contactChannelsSchema } from "./site-settings-validation";
import { updateHomeSettings, updateSiteSettings } from "./site-settings";
import { updateThemeSettings, saveCustomPreset, deleteCustomPreset } from "./theme-service";
import { type ThemeColors, type ThemeTemplateKey } from "./theme";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; code: string; error: string };

const themeSettingsSchema = z.object({
  template: z.enum(["signature", "ocean", "emerald", "royal", "sunset", "minimal", "flightblu", "custom"]),
  colors: z.record(z.string()).optional(),
});

/** Save the brand theme settings (template + custom colors). */
export const saveThemeSettingsAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = themeSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    await updateThemeSettings({
      template: parsed.data.template as ThemeTemplateKey,
      colors: parsed.data.colors as Partial<ThemeColors> | undefined,
    });
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

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

/**
 * Save the floating chat-widget contact channels (WhatsApp, Messenger, Call,
 * Instagram) WITHOUT touching brand fields. Absent preserves, "" clears
 * (hides that icon), a value replaces — merged in updateSiteSettings via the
 * channelText rule. Same settings tag, so the public widget refreshes in one
 * cache hop.
 */
export const saveContactChannelsAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = contactChannelsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    const { getSiteSettings } = await import("./site-settings");
    const current = await getSiteSettings();
    await updateSiteSettings({
      ...current,
      ...parsed.data,
      footerDescription: current.footerDescription ?? undefined,
      copyright: current.copyright ?? undefined,
    });
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

/** Toggle search-engine indexing alone (SEO & Indexing section). */
export const setSearchVisibilityAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = z.object({ searchEngineVisibility: z.boolean() }).safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    const { getSiteSettings } = await import("./site-settings");
    const current = await getSiteSettings();
    await updateSiteSettings({
      ...current,
      ...parsed.data,
      footerDescription: current.footerDescription ?? undefined,
      copyright: current.copyright ?? undefined,
    });
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

/** Save footer config alone (columns, links, socials, copyright). */
const footerSettingsSchema = siteSettingsInputSchema.pick({
  footerDescription: true,
  footerColumns: true,
  footerSocials: true,
  copyright: true,
});

export const saveFooterSettingsAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = footerSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    const { getSiteSettings } = await import("./site-settings");
    const current = await getSiteSettings();
    await updateSiteSettings({
      ...current,
      ...parsed.data,
      footerDescription: parsed.data.footerDescription ?? current.footerDescription ?? undefined,
      copyright: parsed.data.copyright ?? current.copyright ?? undefined,
    });
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

/** Save a named custom theme preset (§2.1). */
const customPresetSchema = z.object({
  id: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1, "Preset name is required").max(80),
  colors: z.record(z.string().trim().min(1)),
});

export const saveCustomPresetAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = customPresetSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    const { DEFAULT_THEME_SETTINGS } = await import("./theme");
    const colors = {
      ...DEFAULT_THEME_SETTINGS.colors,
      ...parsed.data.colors,
    } as ThemeColors;
    await saveCustomPreset({ id: parsed.data.id, name: parsed.data.name, colors });
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);

/** Delete a named custom theme preset. */
export const deleteCustomPresetAction = settingsAction<unknown>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    await deleteCustomPreset(parsed.data.id);
    updateTag(CACHE_TAGS.settings);
    return { ok: true };
  },
);
