/**
 * One-shot retry for TRANSIENT database failures (connection-level only):
 * pooler hiccups, half-open sockets, server restarts. A retried query that
 * merely ran slowly is NOT retried here — client deadlines (withTimeout) own
 * that case, and a timeout must not double the user's wait.
 *
 * Error classification mirrors scripts/migrate-lib.mjs (isRetryableDbError):
 * Node network codes + the postgres.js connection-failure messages, walked
 * through the cause chain so wrapped errors (drizzle, better-auth) still
 * classify. Application errors (constraint violations, validation) never
 * match and are thrown immediately.
 */

const RETRYABLE_CODES = new Set([
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "EPIPE",
  // Postgres connection-exception class + shutdown admin codes.
  "08000",
  "08001",
  "08003",
  "08006",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

const RETRYABLE_MESSAGES =
  /CONNECT_TIMEOUT|CONNECTION_CLOSED|CONNECTION_DESTROYED|Connection terminated unexpectedly/i;

export function isTransientDbError(err: unknown): boolean {
  const seen = new Set<unknown>();
  for (let cur: unknown = err; cur && !seen.has(cur); cur = (cur as { cause?: unknown }).cause) {
    seen.add(cur);
    if (typeof cur !== "object") continue;
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && RETRYABLE_CODES.has(code)) return true;
    const message = (cur as { message?: unknown }).message;
    if (typeof message === "string" && RETRYABLE_MESSAGES.test(message)) return true;
  }
  return false;
}

/** Run `fn`, retrying once (by default) when it fails with a transient
 *  connection error. The full budget (attempts × delay) should live INSIDE a
 *  withTimeout deadline, not around it. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 2);
  const delayMs = opts.delayMs ?? 150;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isTransientDbError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
