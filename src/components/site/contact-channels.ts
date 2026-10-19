/**
 * Contact-channel link builders — the SINGLE place admin-configured channel
 * values become URLs. Pure, deterministic, server+client safe.
 *
 * Each builder returns null when its value is unconfigured (empty/whitespace
 * or digitless) so callers hide that icon instead of emitting a broken link:
 *   - whatsappNumber  -> https://wa.me/<digits>?text=<prefill>
 *   - messengerUsername -> https://m.me/<username>
 *   - callNumber      -> tel:+<digits>
 *   - instagramHandle -> https://instagram.com/<handle> (or the full URL as-is)
 *
 * Poison-guard: a value that LOOKS like a javascript:/data: URL never passes —
 * builders only ever emit https:/tel: links they constructed themselves.
 */
export type ContactChannels = {
  whatsappNumber: string;
  whatsappPrefill: string | null;
  messengerUsername: string;
  callNumber: string;
  instagramHandle: string;
};

function digitsOf(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/** https://wa.me/<digits>?text=<prefill> — null when no digits. */
export function whatsappChannelLink(
  number: string,
  prefill?: string | null,
): string | null {
  const digits = digitsOf(number);
  if (!digits) return null;
  const text = (prefill || "").trim();
  return text
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${digits}`;
}

/** https://m.me/<username> — null when blank; rejects anything URL-shaped. */
export function messengerChannelLink(username: string): string | null {
  const clean = (username || "").trim().replace(/^@+/, "");
  if (!clean) return null;
  if (/[:/\\?]/.test(clean)) return null;
  if (!/^[A-Za-z0-9.]+$/.test(clean)) return null;
  return `https://m.me/${clean}`;
}

/** tel:+<digits> — null when no digits. */
export function callChannelLink(number: string): string | null {
  const digits = digitsOf(number);
  return digits ? `tel:+${digits}` : null;
}

/** https://instagram.com/<handle> (or the full URL as-is) — null when blank. */
export function instagramChannelLink(handle: string): string | null {
  const clean = (handle || "").trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) {
    try {
      const url = new URL(clean);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  const bare = clean.replace(/^@+/, "").replace(/\/+$/, "");
  if (!bare || !/^[A-Za-z0-9._]+$/.test(bare)) return null;
  return `https://instagram.com/${bare}`;
}

export type ChatChannelDef = {
  key: "whatsapp" | "messenger" | "call" | "instagram";
  label: string;
  href: string;
};

/**
 * Configured channels in fan-out order (WhatsApp → Messenger → Call →
 * Instagram). Empty values are skipped, so the widget shows exactly what the
 * operator configured — zero icons when nothing is set (caller hides the FAB).
 */
export function resolveChatChannels(ch: ContactChannels): ChatChannelDef[] {
  const out: ChatChannelDef[] = [];
  const wa = whatsappChannelLink(ch.whatsappNumber, ch.whatsappPrefill);
  if (wa) out.push({ key: "whatsapp", label: "WhatsApp", href: wa });
  const mg = messengerChannelLink(ch.messengerUsername);
  if (mg) out.push({ key: "messenger", label: "Messenger", href: mg });
  const call = callChannelLink(ch.callNumber);
  if (call) out.push({ key: "call", label: "Call", href: call });
  const ig = instagramChannelLink(ch.instagramHandle);
  if (ig) out.push({ key: "instagram", label: "Instagram", href: ig });
  return out;
}
