import { isUniqueViolation } from "@/lib/db-utils";

// Shared slug-collision machinery for the soft-delete-aware "recreate after
// trash" flow used by catalog listings, content posts/pages, and landing
// pages. The shared core owns the control flow (retry on unique violation,
// probe the blocker, suffix hunt); each module supplies a SlugContext that
// binds the core to its own table, typed error class, and user-facing noun.

/** Per-module glue for the shared slug helpers: two table-specific probes
 *  (typed against the module's own schema) plus the typed SLUG_CONFLICT error
 *  constructor and the entity noun used in messages. */
export type SlugContext = {
  /** Does any row — live OR soft-deleted/trashed — already use this slug? */
  exists(slug: string): Promise<boolean>;
  /** Is the row currently holding this slug soft-deleted (so recovery is
   *  allowed)? Live-row collisions are genuine conflicts. */
  isDeleted(slug: string): Promise<boolean>;
  /** Build the module's typed SLUG_CONFLICT error. */
  conflict(message: string): Error;
  /** Entity noun for user-facing messages, e.g. "listing", "landing page". */
  noun: string;
};

/** First free `base-2`, `base-3`, … slug not already used (live OR trashed). */
export async function nextAvailableSlug(
  base: string,
  ctx: Pick<SlugContext, "exists" | "conflict">,
): Promise<string> {
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await ctx.exists(candidate))) return candidate;
  }
  throw ctx.conflict(`No free slug available for "${base}".`);
}

/**
 * Insert with admin-friendly slug recovery. `insert` receives the slug to
 * write and returns the created row's id. When the insert collides with a
 * row that was soft-deleted (the classic "recreate after trash" flow), we
 * re-try under the next free `-2`/`-3`/… suffixed slug instead of failing. A
 * collision with a LIVE row is a genuine conflict and surfaces as the
 * module's typed SLUG_CONFLICT error; anything else re-throws untouched.
 */
export async function insertWithSlugRecovery(
  slug: string,
  ctx: SlugContext,
  insert: (slug: string) => Promise<string>,
): Promise<string> {
  try {
    return await insert(slug);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    if (!(await ctx.isDeleted(slug))) {
      throw ctx.conflict(`A ${ctx.noun} with slug "${slug}" already exists.`);
    }
    const free = await nextAvailableSlug(slug, ctx);
    try {
      return await insert(free);
    } catch (retryErr) {
      if (isUniqueViolation(retryErr)) {
        throw ctx.conflict(`A ${ctx.noun} with slug "${free}" already exists.`);
      }
      throw retryErr;
    }
  }
}
