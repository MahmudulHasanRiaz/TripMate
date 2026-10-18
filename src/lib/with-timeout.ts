/**
 * Race a promise against a hard deadline. The underlying work keeps running
 * (the caller has no cancellation handle), but the caller gets a bounded
 * rejection instead of hanging: pool-level guards (statement_timeout in
 * db/connection.ts) are what actually free server resources; this is the
 * user-facing deadline on top.
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
