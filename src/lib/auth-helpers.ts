import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { withRetry } from "@/lib/with-retry";
import { withTimeout } from "@/lib/with-timeout";
import { hasPermission, type UserRole } from "@/modules/users/permissions";

export type Session = {
  user: { id: string; email: string; name: string; role: UserRole; phone?: string | null };
  session: { id: string; userId: string; expiresAt: Date };
};

/** A jammed database must never hang a render — admin pages used to sit for
 *  ~10 minutes while queries queued behind a wedged pool connection (see
 *  db/connection.ts). Bound the lookup; on timeout or failure, treat the
 *  request as anonymous: requireSession() then redirects to /login instead of
 *  the tree hanging. This fails CLOSED — every guarded consumer (admin
 *  layouts, account pages, server actions) re-derives its own decision from
 *  this single result, so a false "anonymous" can never authorize anything. */
const SESSION_LOOKUP_TIMEOUT_MS = 15_000;

/**
 * Reads the current session, memoized per request with React.cache so every
 * consumer in one render pass (layout + page + server action) shares a single
 * Better Auth read and headers() call instead of one per consumer. Server-only
 * by import; the cache is scoped to the request's server runtime.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  // Prerendering must stop here: Better Auth validates the session by
  // comparing its expiry against the current time (`new Date()`), an unstable
  // value that can't be computed during a prerender/validation pass. This is
  // the explicit "wait for a real user request" signal (see
  // docs/app/api-reference/functions/connection) — the dev overlay used to
  // flag the `new Date()` inside getSession as a blocking-route error.
  await connection();
  const requestHeaders = await headers();
  const result = await withTimeout(
    withRetry(() => auth.api.getSession({ headers: requestHeaders })),
    SESSION_LOOKUP_TIMEOUT_MS,
    `Session lookup timed out after ${SESSION_LOOKUP_TIMEOUT_MS}ms`,
  ).catch((err: unknown) => {
    console.warn(
      "[getSession] Session lookup failed, treating this request as anonymous:",
      err,
    );
    return null;
  });
  if (!result?.user) return null;
  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: (result.user as Session["user"]).role ?? "customer",
      phone: (result.user as Session["user"]).phone ?? null,
    },
    session: result.session,
  } as Session;
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}

export async function requirePermission(key: string): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.user.role, null, key)) redirect("/");
  return session;
}
