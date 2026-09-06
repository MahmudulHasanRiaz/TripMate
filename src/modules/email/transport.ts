import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Builds a nodemailer SMTP transport from the live process.env.
 *
 * IMPORTANT: reads process.env at CALL time — never route through getEnv().
 * The setup wizard (Task 8) writes SMTP_* values then hot-reloads config; a
 * module-load-time snapshot would be stale.
 *
 * Returns null when SMTP_HOST is unset → callers treat email as a no-op.
 *
 * All transports carry explicit timeouts (connection/socket 10s, greeting 5s)
 * so a dead or black-holed SMTP peer can never stall a request path that sends
 * mail (the public lead form sends two emails).
 */
export function getSmtpTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    connectionTimeout: 10000,
    socketTimeout: 10000,
    greetingTimeout: 5000,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/**
 * Same transport factory but driven by explicit values instead of env — used
 * by the setup wizard's SMTP test-send before values are persisted to .env.
 */
export function buildTransportFromValues(values: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
}): Transporter {
  return nodemailer.createTransport({
    host: values.host,
    port: values.port,
    secure: values.port === 465,
    connectionTimeout: 10000,
    socketTimeout: 10000,
    greetingTimeout: 5000,
    auth: values.user ? { user: values.user, pass: values.pass } : undefined,
  });
}
