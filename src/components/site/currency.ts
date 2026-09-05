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
 * Currency-aware price label. Listings default to BDT (the ৳ market's Indian
 * digit grouping); any other currency falls back to ISO-code + grouped number
 * so a non-BDT listing is never mislabelled as taka.
 */
export function formatMoney(amount: number, currency = "BDT"): string {
  return currency === "BDT" ? formatTaka(amount) : `${currency} ${takaFormatter.format(amount)}`;
}

/** +8801700000000 -> wa.me/8801700000000 (digits only, country code kept). */
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

/** +8801700000000 -> tel:+8801700000000. */
export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits}`;
}
