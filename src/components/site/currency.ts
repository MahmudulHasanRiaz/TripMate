/**
 * Currency + contact-link formatting shared by public components. Pure,
 * deterministic helpers — no client state, safe in server components.
 */

/** Indian/Bengali digit grouping (1,45,000) is what the ৳ market expects. */
const takaFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Whole-taka amount -> "৳1,45,000". */
export function formatTaka(amount: number): string {
  return `৳${takaFormatter.format(amount)}`;
}

/**
 * Formatters per ISO currency. `Intl.NumberFormat` picks the correct digit
 * grouping for the currency's own conventions (en-US would Indian-group "USD
 * 8,50,000" otherwise); one formatter is built and reused per currency. Invalid
 * ISO codes are never trusted to throw at render time — they fall back to a
 * plain grouped number under a bare code prefix.
 */
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat | null {
  const cached = currencyFormatterCache.get(currency);
  if (cached) return cached;
  let formatter: Intl.NumberFormat | null = null;
  try {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    });
    // Verify the code is real (the constructor accepts some junk silently).
    void formatter.format(0);
  } catch {
    formatter = null;
  }
  if (formatter) currencyFormatterCache.set(currency, formatter);
  return formatter;
}

const groupedFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Currency-aware price label. Listings default to BDT (the ৳ market's Indian
 * digit grouping via formatTaka); any other currency renders through that
 * ISO's own Intl formatter ("$8,50,000" would be wrong — USD groups as
 * "$850,000"), or a bare-code grouped fallback when the code is unparseable.
 */
export function formatMoney(amount: number, currency = "BDT"): string {
  if (currency === "BDT") return formatTaka(amount);
  const formatter = formatterFor(currency);
  if (formatter) return formatter.format(amount);
  return `${currency} ${groupedFormatter.format(amount)}`;
}

/**
 * +8801700000000 -> wa.me/8801700000000 (digits only, country code kept).
 * Returns null when the phone carries no digits (empty, whitespace-only or
 * punctuation) so callers can skip the link entirely instead of emitting a
 * broken `wa.me/` — render sites guard on the non-null href.
 */
export function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

/** +8801700000000 -> tel:+8801700000000. Null on an empty/whitespace phone. */
export function telLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits}` : null;
}
