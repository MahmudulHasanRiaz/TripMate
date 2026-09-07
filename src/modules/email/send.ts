import "server-only";
import { getSmtpTransport } from "./transport";

/**
 * Sends an email through the configured SMTP transport.
 *
 * FAILURE CONTRACT (binding for every caller):
 * - SMTP unconfigured (SMTP_HOST unset) → logs the intended send and returns
 *   { sent: false }. Never throws. Dev/staging stays functional pre-wiring.
 * - SMTP configured but the send fails (network/auth/timeout — the transport
 *   carries 10s connection / 5s greeting / 10s socket bounds) → THROWS.
 *   Callers on user-facing paths (lead/order/payment actions) MUST wrap in
 *   try/catch so a mail outage never fails the business mutation; admin-only
 *   surfaces may surface the error to the operator.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const transport = getSmtpTransport();
  if (!transport) {
    console.info(`[email:no-op] ${opts.subject} → ${opts.to}`);
    return { sent: false };
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "TripMate <no-reply@localhost>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { sent: true };
}
