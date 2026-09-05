import { GuardError, withGuard } from "@/lib/guard";
import { MediaError } from "@/modules/media/service";
import { uuidSchema } from "@/modules/media/validation";
import type { Session } from "@/lib/auth-helpers";

/**
 * Shared server-action plumbing for the media admin surface.
 *
 * Every mutation runs through `mediaAction`: it wraps the body in
 * `withGuard({ permission: "media.manage", rateLimit? })` and converts the two
 * thrown error families into the action's `{ ok:false }` return payload instead
 * of leaking them through Next's error serialization:
 *   - GuardError   -> { ok:false, error: "UNAUTHORIZED" | "RATE_LIMITED" }
 *   - MediaError   -> { ok:false, code, error: message } (typed: NOT_FOUND —
 *                     each surfaces with specific copy in the UI)
 *
 * Anything else re-throws so the global error boundary owns unexpected
 * failures. Storage-layer failures (misconfigured R2, disk full) are caught
 * inside the actions themselves and relayed as { code:"STORAGE" } so an
 * operator sees the real cause instead of a 500. This module must only ever be
 * imported from a 'use server' file: `MediaError` pulls in the server-only
 * service layer.
 */

export type MediaActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/** Trust-boundary check for id params that flow straight into DB calls — a raw
 *  malformed value (empty string, non-uuid, wrong type) would otherwise surface
 *  as a raw PG "invalid input syntax for type uuid" 500. Returns null when the
 *  value is not a uuid; the action then relays { ok:false, code:"VALIDATION",
 *  error:"Invalid id" }. */
export function parseMediaId(id: string): string | null {
  return uuidSchema.safeParse(id).success ? id : null;
}

export function mediaAction<TInput, TOutput extends MediaActionResult>(
  opts: { rateLimit?: { limit: number; windowMs: number } },
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "media.manage", ...opts }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof MediaError) {
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
