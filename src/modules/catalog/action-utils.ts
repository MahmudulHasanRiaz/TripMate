import { GuardError, withGuard } from "@/lib/guard";
import { CatalogError } from "@/modules/catalog/service";
import { uuidSchema } from "@/modules/catalog/validation";
import type { Session } from "@/lib/auth-helpers";

/**
 * Shared server-action plumbing for the catalog admin surface.
 *
 * Every mutation runs through `adminAction`: it wraps the body in
 * `withGuard({ permission: "catalog.manage" })` and converts the two thrown
 * error families into the action's `{ ok:false }` return payload instead of
 * leaking them through Next's error serialization:
 *   - GuardError  -> { ok:false, error: "UNAUTHORIZED" } (relay, client-friendly)
 *   - CatalogError-> { ok:false, code, error: message }  (typed: SLUG_CONFLICT,
 *     IN_USE, NOT_FOUND, INVALID_REFERENCE — each surfaces in the UI with
 *     specific copy and, for slug errors, attaches to the slug field)
 *
 * Anything else re-throws so the global error boundary owns unexpected
 * failures. This module must only ever be imported from a 'use server' file:
 * `CatalogError` pulls in the server-only service layer.
 */

export type ActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/** Trust-boundary check for id params that flow straight into DB calls — a raw
 *  malformed value (empty string, non-uuid, wrong type) would otherwise surface
 *  as a raw PG "invalid input syntax for type uuid" 500. Returns null when the
 *  value is not a uuid; the action then relays { ok:false, code:"VALIDATION",
 *  error:"Invalid id" }. */
export function parseActionId(id: string): string | null {
  return uuidSchema.safeParse(id).success ? id : null;
}

export function adminAction<TInput, TOutput extends ActionResult>(
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "catalog.manage" }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof CatalogError) {
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
