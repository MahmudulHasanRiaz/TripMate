/**
 * Meta Conversions API event catalogue — pure (no server-only marker, no DB, no
 * crypto), so this module is importable from client components, server actions,
 * tests and the service layer alike.
 *
 * These are the only event names this app is allowed to raise through Meta CAPI.
 * They map the funnel/stage vocabulary to Meta's canonical `event_name` values:
 * `PageView`/`ViewContent` for engagement, `InitiateCheckout` for cart entry,
 * `Lead`/`Contact` for the conversion points, and `Purchase` for a completed
 * booking. Keeping the list closed (a const union, not a free string) means the
 * service and every call site can only produce events Meta understands, and the
 * typechecker catches a mistyped name at compile time.
 */

export const CAPIC_EVENT_NAMES = [
  "Lead",
  "Contact",
  "InitiateCheckout",
  "Purchase",
  "ViewContent",
  "PageView",
] as const;

export type CapiEventName = (typeof CAPIC_EVENT_NAMES)[number];
