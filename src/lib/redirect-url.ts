/**
 * Placeholder firewall for admin/seed-supplied redirect URLs (FU-28).
 *
 * Demo seed data shipped partner redirects on reserved placeholder
 * hosts (e.g. https://b2b.tripmate.example/flights) and they reached
 * production verbatim — visitors clicked "Search Global Flights" and
 * landed on a domain that can never resolve. A redirect URL is usable
 * only when it is a real http(s) URL on a non-reserved host; anything
 * else (empty, unparsable, .example/.test/.invalid/.localhost, a bare
 * localhost) is treated as NOT CONFIGURED, so every caller falls back
 * to its internal path (service page / inquiry) instead of sending a
 * visitor to a dead placeholder.
 */
export function usableRedirectUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".example") ||
      host.endsWith(".test") ||
      host.endsWith(".invalid") ||
      host.endsWith(".localhost")
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
