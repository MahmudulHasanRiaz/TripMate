import { renderBaseEmail } from "./base";

/**
 * Lead-flow transactional emails: the customer receipt (renderLeadReceived) and
 * the staff notification when a new lead is auto-assigned (renderLeadAssigned).
 * Both are fire-and-forget inside the public submitLead action and share
 * renderBaseEmail's branded shell (base.tsx) — the body is the only
 * template-specific part.
 *
 * SECURITY: bodyHtml is injected by renderBaseEmail through
 * dangerouslySetInnerHTML, so the ONLY way a user-derived value (a contact's
 * name, the landing title, the submitted phone) may enter the body is through
 * escapeHtml (& < > " → entities) at its point of interpolation. Raw user
 * strings are never concatenated into HTML. Returned subjects are plain text
 * headers, so user-derived fragments in them are run through subjectSafe, which
 * strips CR/LF (header injection) and angle brackets.
 *
 * Server-side only by import site (the leads submit action); nothing here reads
 * the DB or the network.
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

/** Customer receipt for a successful landing-form submission. */
export function renderLeadReceived(opts: {
  name: string;
  landingTitle: string;
  sitePhone: string;
}): { subject: string; html: string } {
  // Heading text is rendered through renderBaseEmail's JSX, which escapes it —
  // so the plain (unescaped) name is passed and never double-escaped.
  const heading = opts.name
    ? `Thanks, ${opts.name} — enquiry received`
    : "Thanks — enquiry received";

  const intro = `We received your enquiry${
    opts.landingTitle ? ` about ${opts.landingTitle}` : ""
  }. A member of our team will review it and get back to you shortly.`;

  let phoneBlock = "";
  if (opts.sitePhone) {
    const phone = escapeHtml(opts.sitePhone);
    phoneBlock = paragraph(
      `Prefer to talk now? Call or WhatsApp us on <a href="tel:${phone}" style="color:${PRIMARY}">${phone}</a>.`,
    );
  }

  const spamNote =
    '<p style="font-size:13px;color:#888888;margin-top:16px">If you don\'t hear from us within a business day, please check your spam folder.</p>';

  const bodyHtml = [
    paragraph(escapeHtml(intro)),
    phoneBlock,
    spamNote,
  ].join("");

  const subject = subjectSafe(
    opts.landingTitle
      ? `Your ${opts.landingTitle} enquiry — we'll be in touch`
      : "Your enquiry — we'll be in touch",
  );

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}

/** Staff notification when the round-robin assigner hands a lead to someone. */
export function renderLeadAssigned(opts: {
  leadName: string;
  landingTitle: string;
  adminUrl: string;
  assignedToName: string;
}): { subject: string; html: string } {
  const heading = opts.assignedToName
    ? `New lead assigned to ${opts.assignedToName}`
    : "New lead awaiting assignment";

  let detail = "A new lead";
  if (opts.leadName) detail += ` from ${opts.leadName}`;
  if (opts.landingTitle) detail += ` (${opts.landingTitle})`;
  detail += " was just captured and assigned to your queue.";

  let inboxBlock = "";
  if (opts.adminUrl) {
    const url = escapeHtml(opts.adminUrl);
    inboxBlock = paragraph(
      `Open it in the lead inbox: <a href="${url}" style="color:${PRIMARY}">${url}</a>`,
    );
  }

  const rows =
    row("Assigned to", opts.assignedToName) +
    row("Landing page", opts.landingTitle) +
    row("Lead name", opts.leadName);

  const bodyHtml = [paragraph(escapeHtml(detail)), inboxBlock, rows].join("");

  const subject = subjectSafe(
    opts.assignedToName
      ? opts.landingTitle
        ? `New ${opts.landingTitle} lead assigned to ${opts.assignedToName}`
        : `New lead assigned to ${opts.assignedToName}`
      : "New lead awaiting assignment",
  );

  return { subject, html: renderBaseEmail({ heading, bodyHtml }) };
}
