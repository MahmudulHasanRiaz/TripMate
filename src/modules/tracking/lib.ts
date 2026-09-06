import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { CapiEventName } from "./events";

/**
 * Hashing + Meta event-building helpers. Pure functions (no DB, no network) but
 * server-only because they wrap node:crypto — importing this into a client
 * bundle fails the build, exactly like the email/catalog service layers.
 *
 * Meta's Conversions API expects every `user_data` value to arrive SHA-256
 * hashed. The canonical string each field is hashed FROM is decided here so the
 * server and any browser-side pixel agree:
 *   - email: lowercased + trimmed
 *   - phone: stripped to digits, a local Bangladeshi `0…` number normalized to
 *     the `880…` country-code form with NO leading plus (Meta's canonical shape
 *     for a `ph` hash is digits + country code, not `+`)
 *   - fbp / fbc: opaque identifiers, hashed as-is (trimmed only)
 *
 * Absent fields are omitted from the output entirely — never sent as empty
 * arrays.
 */

/** Raw identity fields a caller may raise an event with. Values are hashed at
 *  the buildMetaEvent boundary; nothing here ever persists the raw value. */
export type UserHashInput = {
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

/** A tracking event before it is shaped for Meta. `eventId` is a server-side
 *  dedupe key echoed as Meta's `event_id` so the API can drop retries. */
export type MetaEventInput = {
  eventName: CapiEventName;
  eventId?: string;
  /** The page the event happened on → `event_source_url`. */
  sourceUrl?: string;
  user?: UserHashInput;
  customData?: Record<string, unknown>;
};

/** The exact payload sent to Meta's Graph events endpoint. */
export type MetaEventPayload = {
  event_name: CapiEventName;
  event_id: string;
  event_time: number; // unix seconds
  user_data: Record<string, string[]>;
  action_source: "website";
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
};

/** sha256 of `value`, hex-encoded — Meta's required hash format. */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Reduce a phone to its digit-only canonical form for hashing. Meta's CAPI
 * expects every `ph` value to be SHA-256 of digits-with-country-code and no
 * leading plus — a `+` is non-canonical and would hash differently from Meta's
 * own normalization. A local Bangladeshi 11-digit number (`0XXXXXXXXXX`, e.g.
 * `01712345678`) becomes `880XXXXXXXXXX` (drop the leading 0, prefix 880); an
 * already-coded `880XXXXXXXXXX` (13 digits) and every other digit string pass
 * through unchanged, so a non-BD number is never accidentally given a +88
 * prefix.
 */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  // Local Bangladeshi: 0 + 10 more digits → 880 + the same 10.
  if (/^0\d{10}$/.test(digits)) return `880${digits.slice(1)}`;
  return digits;
}

/** Hash a raw user-data map into Meta's hashed field arrays (`em`, `ph`, …). */
export function hashUserData(user: UserHashInput): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const email = user.email?.trim().toLowerCase();
  if (email) out.em = [sha256(email)];
  const phone = user.phone ? normalizePhone(user.phone) : "";
  if (phone) out.ph = [sha256(phone)];
  const fbp = user.fbp?.trim();
  if (fbp) out.fbp = [sha256(fbp)];
  const fbc = user.fbc?.trim();
  if (fbc) out.fbc = [sha256(fbc)];
  return out;
}

/** Shape a tracking event into a Meta CAPI payload (hashing user_data). */
export function buildMetaEvent(event: MetaEventInput): MetaEventPayload {
  const payload: MetaEventPayload = {
    event_name: event.eventName,
    event_id: event.eventId ?? randomUUID(),
    event_time: Math.floor(Date.now() / 1000),
    user_data: hashUserData(event.user ?? {}),
    action_source: "website",
  };
  if (event.sourceUrl) payload.event_source_url = event.sourceUrl;
  if (event.customData && Object.keys(event.customData).length > 0) {
    payload.custom_data = event.customData;
  }
  return payload;
}
