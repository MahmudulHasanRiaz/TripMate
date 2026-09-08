import "server-only";
import { headers } from "next/headers";
import { getSession, type Session } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

export class GuardError extends Error {
  constructor(public code: "UNAUTHORIZED" | "RATE_LIMITED") {
    super(code);
  }
}

const limiters = new Map<string, SlidingWindowRateLimiter>();

function getLimiter(limit: number, windowMs: number) {
  const key = `${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(key, new SlidingWindowRateLimiter({ limit, windowMs }));
  }
  return limiters.get(key)!;
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local"
  );
}

export function withGuard<TInput, TOutput>(
  opts: {
    permission?: string;
    rateLimit?: { limit: number; windowMs: number };
    public?: boolean;
  },
  action: (input: TInput, session: Session | null) => Promise<TOutput>,
) {
  return async (input: TInput, rateKey?: string): Promise<TOutput> => {
    let session: Session | null = null;
    try {
      session = await getSession();
    } catch (e) {
      if (!opts.public) throw e;
      console.warn("[guard] getSession failed for public action, proceeding without session", e);
    }

    if (!opts.public && !session) throw new GuardError("UNAUTHORIZED");
    if (opts.permission && !session) throw new GuardError("UNAUTHORIZED");
    if (
      opts.permission &&
      session &&
      !hasPermission(session.user.role, null, opts.permission)
    ) {
      throw new GuardError("UNAUTHORIZED");
    }

    if (opts.rateLimit) {
      const key = rateKey ?? (await clientKey());
      const rl = getLimiter(opts.rateLimit.limit, opts.rateLimit.windowMs);
      if (!rl.check(key).allowed) throw new GuardError("RATE_LIMITED");
    }

    return action(input, session);
  };
}
