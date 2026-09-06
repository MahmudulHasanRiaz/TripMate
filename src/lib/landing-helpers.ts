import { RESERVED_FORM_FIELD_KEYS } from "@/modules/landing-pages/section-types";

export const STANDARD_NAME_KEYS = ["name", "full_name", "fullname"] as const;
export const STANDARD_PHONE_KEYS = ["phone", "tel", "mobile", "phone_number"] as const;

/**
 * Auto-derives a form-safe field key from a user-supplied label.
 * Automatically aligns with reserved/canonical keys (full_name, name, phone, mobile, tel, email)
 * so that lead inbox indexing works seamlessly.
 */
export function autoFieldKey(label: string): string {
  const lower = label.trim().toLowerCase();
  if (lower === "full name" || lower === "fullname") return "full_name";
  if (lower === "name" || lower.endsWith(" name")) return "name";
  if (lower === "phone number" || lower === "phone no" || lower === "phone") return "phone";
  if (lower === "mobile" || lower === "mobile number") return "mobile";
  if (lower === "telephone" || lower === "tel") return "tel";
  if (lower === "email" || lower === "email address") return "email";
  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "field";
}

export function isStandardNameKey(key: string): boolean {
  return (STANDARD_NAME_KEYS as readonly string[]).includes(key.toLowerCase());
}

export function isStandardPhoneKey(key: string): boolean {
  return (STANDARD_PHONE_KEYS as readonly string[]).includes(key.toLowerCase());
}

export function isReservedFieldKey(key: string): boolean {
  return RESERVED_FORM_FIELD_KEYS.includes(key);
}
