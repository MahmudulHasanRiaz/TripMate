import "server-only";
import { getSmtpTransport } from "./transport";

/**
 * Sends an email through the configured SMTP transport.
 *
 * When SMTP is unconfigured (SMTP_HOST unset) this logs the intended send and
 * returns { sent: false } instead of throwing — dev/staging flows stay
 * functional before mail is wired up.
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
