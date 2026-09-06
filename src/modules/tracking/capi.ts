import "server-only";
import type { MetaEventPayload } from "./lib";

/**
 * Meta Conversions API HTTP transport. Fire-and-log by contract: `sendCapiEvent`
 * NEVER throws. A failure (network, non-2xx, missing config) resolves to
 * `{ ok:false }` so the caller — typically the tracking service after it has
 * already logged the event row — can record the outcome and move on without an
 * unhandled rejection ever reaching the request path.
 *
 * Env is read at CALL time, never through getEnv(): the META_* keys are part of
 * the writable env surface (src/lib/env-file.ts) that the setup wizard and the
 * Meta config actions hot-reload, so a module-load-time snapshot would be stale
 * — same constraint as the SMTP transport (src/modules/email/transport.ts).
 *
 * Configuration contract:
 *   - META_PIXEL_ID + META_CAPI_ACCESS_TOKEN must both be set to send.
 *   - META_CAPI_TEST_CODE (optional) routes events to a Meta test event.
 */

export const CAPI_STATUS = {
  /** Logged; the send has not completed yet (or the process died mid-send). */
  pending: "pending",
  /** Meta acknowledged the event (2xx). */
  sent: "sent",
  /** The send failed (network error or Meta returned a non-2xx status). */
  error: "error",
  /** Not attempted because the pixel/token are unconfigured. */
  notConfigured: "meta_not_configured",
} as const;

export type CapiStatus = (typeof CAPI_STATUS)[keyof typeof CAPI_STATUS];

export type CapiSendResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; error: string; status?: number; body?: unknown };

/** Meta Graph API version this build targets — the URL segment before
 *  `/<pixelId>/events`. Kept as one exported const so the endpoint URL and any
 *  test/reference to it never drift. */
export const META_GRAPH_VERSION = "v21.0";

/**
 * Posts one event to Meta's Graph events endpoint
 * (`https://graph.facebook.com/${META_GRAPH_VERSION}/<pixelId>/events`).
 *
 * The request is bounded by an 8-second abort signal so a Meta endpoint that
 * accepts the connection but never answers can only stall this call for 8s —
 * the public lead form (which awaits this behind the tracking service) can
 * never be hung for minutes by a dead Meta. On abort the failure resolves to
 * `{ ok:false, error:"meta_timeout" }` like any other non-throwing outcome.
 */
export async function sendCapiEvent(
  event: MetaEventPayload,
): Promise<CapiSendResult> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) {
    return { ok: false, error: CAPI_STATUS.notConfigured };
  }

  const url = new URL(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events`,
  );
  url.searchParams.set("access_token", accessToken);
  const testCode = process.env.META_CAPI_TEST_CODE?.trim();
  if (testCode) url.searchParams.set("test_event_code", testCode);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event] }),
      signal: AbortSignal.timeout(8000),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null; // non-JSON error body — still report the status
    }
    if (!response.ok) {
      return { ok: false, status: response.status, body, error: "meta_http_error" };
    }
    return { ok: true, status: response.status, body };
  } catch (e) {
    // AbortSignal.timeout aborts with a TimeoutError (some runtimes report a
    // bare AbortError) — surface it as a distinct, testable timeout outcome.
    const name = (e as { name?: string } | null | undefined)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "meta_timeout" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
