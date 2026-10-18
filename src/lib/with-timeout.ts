/**
 * Race a promise against a hard deadline. The underlying work keeps running
 * (the caller has no cancellation handle), but the caller gets a bounded
 * rejection instead of hanging: through the Supabase transaction pooler the
 * effective server-side backstop is Supabase's 2-minute statement_timeout
 * (startup parameters are dropped by Supavisor — verified; only direct /
 * session-mode connections honor the connection params in db/connection.ts).
 * This is the user-facing deadline on top.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
