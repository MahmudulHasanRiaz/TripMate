"use server";

/**
 * Meta (Pixel + CAPI) configuration — guarded server actions for the admin
 * Settings surface.
 *
 * Two reads/writes, split by who may touch them:
 *   - getMetaConfigStatus  → withGuard({ permission: "tracking.view" }) — anyone
 *     who can VIEW the admin tracking/settings surfaces. Resolves
 *     `{ ok:true, status }` with status booleans plus the PUBLIC pixel id only
 *     (the access token is never echoed out of this module; its presence is
 *     reported as `capiTokenSet`, its value never). A denied guard relays
 *     `{ ok:false, error }` — this action never throws to the client.
 *   - saveMetaConfig       → withGuard({ permission: "settings.manage" }) — only
 *     operators who can change settings. A present NON-EMPTY value writes the
 *     META_* key through the whitelist in src/lib/env-file.ts (writeEnvValues)
 *     when this platform's env is locally writable; a present EMPTY value means
 *     REMOVE that key (removeEnvValues), which the local-env path clears. On the
 *     external-env path the writes return a copyBlock of exact KEY=VALUE lines +
 *     instruction text the frontend renders for the operator to paste into their
 *     externally-managed env (Vercel/Portainer/…); because the app cannot write
 *     there, a removal is conveyed as an instruction to delete the key in the
 *     platform env, then Re-check.
 *
 * The input is zod-parsed AT the action boundary and only `parsed.data` (the
 * trimmed coercion) is ever used — never raw input.
 */

import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import { isEnvWritable, removeEnvValues, writeEnvValues } from "@/lib/env-file";
import { getSetting } from "@/modules/settings/service";

/** Public-safe view of the current Meta config. `capiTokenSet` is a boolean —
 *  the token itself is never part of any response from this module. */
export type MetaConfigStatus = {
  envWritable: boolean;
  pixelConfigured: boolean;
  capiTokenSet: boolean;
  testCodeSet: boolean;
  pixelId: string | null;
  /** The `meta` settings row (setup wizard's "skipped" flag), if one exists. */
  settings: { skipped?: boolean } | null;
};

export type MetaConfigInput = {
  pixelId?: string;
  capiAccessToken?: string;
  testEventCode?: string;
};

/** Relayed result of a status read: either the live status or a guard-denial
 *  code surfaced as `{ ok:false, error }` (never an unrelayed throw). */
export type MetaConfigStatusResult =
  | { ok: true; status: MetaConfigStatus }
  | { ok: false; error: string };

export type MetaConfigSaveResult =
  | { ok: true; status: MetaConfigStatus }
  | { ok: true; copyBlock: { instruction: string; lines: string[] } }
  | { ok: false; error: string };

const metaConfigInput = z.object({
  pixelId: z.string().trim().optional(),
  capiAccessToken: z.string().trim().optional(),
  testEventCode: z.string().trim().optional(),
});
type ParsedMetaConfigInput = z.infer<typeof metaConfigInput>;

const ENV_KEY_BY_FIELD = {
  pixelId: "META_PIXEL_ID",
  capiAccessToken: "META_CAPI_ACCESS_TOKEN",
  testEventCode: "META_CAPI_TEST_CODE",
} as const;

/** Assemble the status from the live env + settings store. Env is read at CALL
 *  time so a just-written value is reflected without a reload (mirror of the
 *  email/SMTP transport). */
async function readMetaConfigStatus(): Promise<MetaConfigStatus> {
  const pixelId = process.env.META_PIXEL_ID?.trim() || null;
  const settings = await getSetting("meta");
  return {
    envWritable: isEnvWritable(),
    pixelConfigured: Boolean(pixelId),
    capiTokenSet: Boolean(process.env.META_CAPI_ACCESS_TOKEN?.trim()),
    testCodeSet: Boolean(process.env.META_CAPI_TEST_CODE?.trim()),
    pixelId,
    settings: settings ?? null,
  };
}

const readStatus = withGuard({ permission: "tracking.view" }, async () =>
  readMetaConfigStatus(),
);
/** No-input alias so callers see a zero-arg action, not the guard's input slot.
 *  Relays a denied guard as `{ ok:false, error }` (mirror of saveMetaConfig's
 *  relay) — this action never throws the guard error to the client. */
export const getMetaConfigStatus = async (): Promise<MetaConfigStatusResult> => {
  try {
    const status = await readStatus(undefined);
    return { ok: true, status };
  } catch (e) {
    if (e instanceof GuardError) return { ok: false, error: e.code };
    throw e;
  }
};

/** Relay thrown GuardError codes into `{ ok:false, error }` so the client never
 *  depends on Next's error serialization. Same contract as the wizard/content
 *  action relays. */
function relaySave(
  action: (input: MetaConfigInput) => Promise<MetaConfigSaveResult>,
): (input: MetaConfigInput) => Promise<MetaConfigSaveResult> {
  return async (input: MetaConfigInput): Promise<MetaConfigSaveResult> => {
    try {
      return await action(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code };
      }
      throw e;
    }
  };
}

/**
 * Save Meta pixel / CAPI values. Local env → write through the whitelist and
 * report the refreshed status. External env → return the KEY=VALUE copy block
 * (values the operator just submitted) instead; nothing is persisted by the app.
 */
export const saveMetaConfig = relaySave(
  withGuard(
    { permission: "settings.manage" },
    async (input: MetaConfigInput): Promise<MetaConfigSaveResult> => {
      const parsed = metaConfigInput.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.join(".");
        return { ok: false, error: field ? `${field}: ${issue.message}` : issue.message };
      }
      const data: ParsedMetaConfigInput = parsed.data;

      // A field that was NOT submitted (undefined) is left untouched; a present
      // NON-EMPTY value is written; a present EMPTY value means REMOVE the key.
      const writes: Record<string, string> = {};
      const removals: string[] = [];
      (Object.keys(ENV_KEY_BY_FIELD) as (keyof typeof ENV_KEY_BY_FIELD)[]).forEach(
        (field) => {
          const value = data[field];
          if (value === undefined) return;
          if (value === "") removals.push(ENV_KEY_BY_FIELD[field]);
          else writes[ENV_KEY_BY_FIELD[field]] = value;
        },
      );
      const hasChanges = Object.keys(writes).length > 0 || removals.length > 0;
      if (!hasChanges) {
        return {
          ok: false,
          error: "No Meta values to save — fill in or clear at least one field.",
        };
      }

      if (isEnvWritable()) {
        if (Object.keys(writes).length > 0) writeEnvValues(writes);
        if (removals.length > 0) removeEnvValues(removals);
        const status = await readMetaConfigStatus();
        return { ok: true, status };
      }

      // External env (Vercel/Portainer/…): the app cannot rewrite the platform's
      // environment, so it hands back a copy block instead. Writes become
      // paste-ready KEY=VALUE lines; removals cannot be pasted — the operator
      // must delete the key in the platform env to clear it, which the
      // instruction text below calls out.
      const lines = (Object.keys(writes) as string[]).map(
        (key) => `${key}=${writes[key]}`,
      );
      const removalNote =
        removals.length > 0
          ? " To CLEAR a value you left blank, delete that key from the platform's environment variables (a removal can't be written from here), then save again / re-check."
          : "";
      return {
        ok: true,
        copyBlock: {
          instruction:
            "This environment's variables are managed externally (Vercel/Portainer/…), so the app cannot write its .env here. Add the exact lines below to your platform's environment variables, then save again / re-check. Values already present in the environment are left untouched — only the keys you filled in are listed." +
            removalNote,
          lines,
        },
      };
    },
  ),
);
