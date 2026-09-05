import { GuardError, withGuard } from "@/lib/guard";
import { ContentError } from "@/modules/content/service";
import { uuidSchema } from "@/modules/content/validation";
import type { Session } from "@/lib/auth-helpers";

/**
 * Shared server-action plumbing for the content admin surface (posts, post
 * categories, pages).
 *
 * Every mutation runs through `contentAction`: it wraps the body in
 * `withGuard({ permission: "content.manage" })` and converts the two thrown
 * error families into the action's `{ ok:false }` return payload instead of
 * leaking them through Next's error serialization:
 *   - GuardError   -> { ok:false, error: "UNAUTHORIZED" } (relay, client-friendly)
 *   - ContentError -> { ok:false, code, error: message }  (typed: SLUG_CONFLICT,
 *     IN_USE, NOT_FOUND, INVALID_REFERENCE — each surfaces in the UI with
 *     specific copy and, for slug errors, attaches to the slug field)
 *
 * Anything else re-throws so the global error boundary owns unexpected
 * failures. This module must only ever be imported from a 'use server' file:
 * `ContentError` pulls in the server-only service layer.
 *
 * NOTE: the same wrapper shape exists in modules/catalog and modules/media
 * (each bound to its own error class + permission). Consolidating all three
 * into one shared lib was considered but rejected here — the three action
 * surfaces ship on different schedules and a shared helper would couple their
 * error contracts; the ~40-line per-module copy is the repo's accepted cost.
 */

export type ContentActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/** Trust-boundary check for id params that flow straight into DB calls — a raw
 *  malformed value (empty string, non-uuid, wrong type) would otherwise surface
 *  as a raw PG "invalid input syntax for type uuid" 500. Returns null when the
 *  value is not a uuid; the action then relays { ok:false, code:"VALIDATION",
 *  error:"Invalid id" }. */
export function parseContentId(id: string): string | null {
  return uuidSchema.safeParse(id).success ? id : null;
}

export function contentAction<TInput, TOutput extends ContentActionResult>(
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "content.manage" }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof ContentError) {
        return {
          ok: false,
          code: e.code,
          error: e.message,
        } as unknown as TOutput;
      }
      throw e;
    }
  };
}
