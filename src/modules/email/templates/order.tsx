import { renderBaseEmail } from "./base";
import { formatMoney } from "@/components/site/currency";

/**
 * Order-flow transactional emails (Plan 5 T4): the customer-facing notices for
 * the bookings/payments funnel — booking received (renderOrderConfirm), quote
 * ready (renderQuoteReady), payment verified (renderPaymentVerified) and
 * payment rejected (renderPaymentRejected). All are fire-and-forget inside the
 * bookings/payments actions and share renderBaseEmail's branded shell
 * (base.tsx) — the body is the only template-specific part.
 *
 * SECURITY: same contract as lead.tsx. bodyHtml is injected by renderBaseEmail
 * through dangerouslySetInnerHTML, so the ONLY way a user-derived value (the
 * customer name, the listing title, the operator's rejection note) may enter
 * the body is through escapeHtml (& < > " → entities) at its point of
 * interpolation. Raw user strings are never concatenated into HTML. Returned
 * subjects are plain text headers, so user-derived fragments in them are run
 * through subjectSafe, which strips CR/LF (header injection) and angle
 * brackets. Money strings come from the pure formatMoney helper (Intl over
 * numbers) and are still entity-escaped at interpolation like every other
 * value — defense in depth, not trust.
 *
 * Server-side only by import site (the bookings + payments actions); nothing
 * here reads the DB or the network.
 */

const PRIMARY = "#0E5E5A";
const MUTED = "#888888";

/** Escape & < > " to HTML entities. `&` is replaced first so the entities this
 *  function produces are never re-escaped by a later pass. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Subject lines are RFC 5322 headers, not HTML: strip CR/LF (header injection)
 *  and angle brackets so a user value can never smuggle a continuation line or
 *  markup into the header. */
function subjectSafe(value: string): string {
  return value.replace(/[\r\n<>]/g, " ");
}

/** One body paragraph; `innerHtml` must already be entity-escaped. */
function paragraph(innerHtml: string): string {
  return `<p style="font-size:14px;line-height:1.6;margin:6px 0">${innerHtml}</p>`;
}

/** Label/value row; empty value renders nothing. Both sides are escaped. */
function row(label: string, value: string): string {
  if (!value) return "";
  return `<p style="margin:6px 0;font-size:14px"><span style="color:${MUTED}">${escapeHtml(label)}: </span><span>${escapeHtml(value)}</span></p>`;
}

/** Portal CTA block; empty url renders nothing (APP_URL unset → no link, the
 *  copy still stands on its own). */
function portalBlock(url: string, lead: string): string {
  if (!url) return "";
  const href = escapeHtml(url);
  return paragraph(
    `${lead} <a href="${href}" style="color:${PRIMARY}">${href}</a>`,
  );
}

/** Customer notice: their booking/inquiry was received and is in review. */
export function renderOrderConfirm(opts: {
  orderNo: string;
  customerName: string;
  listingTitle: string;
  portalUrl: string;
}): { subject: string; html: string } {
  // Heading text is rendered through renderBaseEmail's JSX, which escapes it —
  // so the plain (unescaped) name is passed and never double-escaped.
  const heading = opts.customerName
    ? `Thanks, ${opts.customerName} — booking received`
    : "Booking received";

  const intro = `We received your booking${
    opts.listingTitle ? ` for ${opts.listingTitle}` : ""
  }. Our team will review it and send you a quote with the final price and payment options.`;

  const bodyHtml = [
    paragraph(escapeHtml(intro)),
    row("Order number", opts.orderNo),
    row("Booked item", opts.listingTitle),
    portalBlock(
      opts.portalUrl,
      "Track your order and pay online any time from your TripMate account:",
    ),
  ].join("");

  const subject = subjectSafe(
    opts.listingTitle
      ? `Booking received — ${opts.orderNo} (${opts.listingTitle})`
      : `Booking received — ${opts.orderNo}`,
  );

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}

/** Customer notice: the operator set a quote — the order is now payable. */
export function renderQuoteReady(opts: {
  orderNo: string;
  customerName: string;
  listingTitle: string;
  quotedPrice: number;
  currency: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const heading = opts.customerName
    ? `Your quote is ready, ${opts.customerName}`
    : "Your quote is ready";

  const price = formatMoney(opts.quotedPrice, opts.currency);
  const intro = `Your quote for order ${opts.orderNo}${
    opts.listingTitle ? ` (${opts.listingTitle})` : ""
  } is ready.`;

  const bodyHtml = [
    paragraph(escapeHtml(intro)),
    row("Order number", opts.orderNo),
    row("Quoted amount", price),
    portalBlock(
      opts.portalUrl,
      "Review the quote and pay securely from your TripMate account:",
    ),
    paragraph("Once your payment is verified, your booking is confirmed."),
  ].join("");

  const subject = subjectSafe(`Your quote is ready — ${opts.orderNo}`);

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}

/** Customer notice: a submitted payment was verified by an operator. */
export function renderPaymentVerified(opts: {
  orderNo: string;
  customerName: string;
  amount: number;
  currency: string;
}): { subject: string; html: string } {
  const heading = opts.customerName
    ? `Payment verified, ${opts.customerName}`
    : "Payment verified";

  const price = formatMoney(opts.amount, opts.currency);
  const intro = `We received and verified your payment of ${price} for order ${opts.orderNo}.`;

  const bodyHtml = [
    paragraph(escapeHtml(intro)),
    row("Order number", opts.orderNo),
    row("Amount paid", price),
    paragraph(
      "We'll finalize your booking and reach out shortly with everything you need for your trip.",
    ),
  ].join("");

  const subject = subjectSafe(`Payment verified — ${opts.orderNo}`);

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}

/** Customer notice: a submitted payment could not be verified. Gentle copy —
 *  the customer is invited to retry, never blamed. */
export function renderPaymentRejected(opts: {
  orderNo: string;
  customerName: string;
  note?: string | null;
}): { subject: string; html: string } {
  const heading = opts.customerName
    ? `We couldn't verify your payment, ${opts.customerName}`
    : "We couldn't verify your payment";

  const intro = `We couldn't verify the payment you submitted for order ${opts.orderNo}. This sometimes happens when a transaction id or sender number doesn't match our statement.`;

  const bodyHtml = [
    paragraph(escapeHtml(intro)),
    row("Order number", opts.orderNo),
    row("Reason", opts.note ?? ""),
    paragraph(
      "Please double-check your transaction details and submit the payment again — or reply to this email and our team will help you sort it out.",
    ),
  ].join("");

  const subject = subjectSafe(`Payment could not be verified — ${opts.orderNo}`);

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}
