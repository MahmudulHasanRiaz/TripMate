import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CAPIC_EVENT_NAMES } from "@/modules/tracking/events";

// lib.ts / capi.ts are server-only (throw outside a React Server runtime); stub
// the marker so the modules import cleanly under vitest's node env — same
// pattern as tests/email.test.ts and tests/env-file.test.ts.
vi.mock("server-only", () => ({}));

import { sha256, hashUserData, buildMetaEvent } from "@/modules/tracking/lib";
import { sendCapiEvent, CAPI_STATUS, META_GRAPH_VERSION } from "@/modules/tracking/capi";
import type { MetaEventPayload } from "@/modules/tracking/lib";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function minimalEvent(overrides: Partial<MetaEventPayload> = {}): MetaEventPayload {
  return {
    event_name: "Lead",
    event_id: "evt-1",
    event_time: 1_700_000_000,
    user_data: { em: ["abc"] },
    action_source: "website",
    ...overrides,
  };
}

describe("tracking events catalogue (pure)", () => {
  it("exposes the six canonical Meta CAPI event names in order", () => {
    expect(CAPIC_EVENT_NAMES).toEqual([
      "Lead",
      "Contact",
      "InitiateCheckout",
      "Purchase",
      "ViewContent",
      "PageView",
    ]);
  });
});

describe("sha256", () => {
  it("returns lowercase 64-char hex deterministically", () => {
    const a = sha256("hello");
    expect(a).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(sha256("hello")).toBe(a);
    expect(sha256("hellp")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashUserData", () => {
  it("trims + lowercases email and hashes it under `em`", () => {
    const out = hashUserData({ email: " User@Example.COM " });
    // sha256("user@example.com")
    expect(out).toEqual({
      em: ["b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514"],
    });
  });

  it("normalizes a local Bangladeshi phone to digit-only 880… before hashing", () => {
    const out = hashUserData({ phone: "017-1234 5678" });
    // sha256("8801712345678") — digits + country code, NO leading plus (the
    // `+` is non-canonical for Meta's Conversions API and would hash to a
    // different `ph` value than Meta's own normalization).
    expect(out).toEqual({
      ph: ["c327520f85b0c6058fed05dfc0a63d8755f325b6ea1b550824f4a8e380d75de1"],
    });
  });

  it("converges an already-international 880 number (+/spaces stripped) to the same hash", () => {
    const local = hashUserData({ phone: "017-1234 5678" });
    const intl = hashUserData({ phone: "+880 1712 3456 78" });
    expect(intl).toEqual(local);
  });

  it("passes non-Bangladeshi international digit strings through unchanged", () => {
    const out = hashUserData({ phone: "44 7911-123456" });
    expect(out.ph).toEqual([sha256("447911123456")]);
  });

  it("hashes fbp/fbc as-is (trimmed) and omits absent fields", () => {
    const out = hashUserData({ fbp: " fb.1.123 ", fbc: "fb.1.abc" });
    expect(out.fbp).toEqual([sha256("fb.1.123")]);
    expect(out.fbc).toEqual([sha256("fb.1.abc")]);
    expect(out.em).toBeUndefined();
    expect(out.ph).toBeUndefined();
  });

  it("returns an empty record when no fields are present", () => {
    expect(hashUserData({})).toEqual({});
    expect(hashUserData({ email: "", phone: "   " })).toEqual({});
  });

  it("combines every present field into one user_data record", () => {
    const out = hashUserData({ email: "A@B.com", phone: "01712345678", fbp: "x" });
    expect(Object.keys(out).sort()).toEqual(["em", "fbp", "ph"]);
  });
});

describe("buildMetaEvent", () => {
  it("produces the CAPI payload shape with hashed user_data", () => {
    const before = Math.floor(Date.now() / 1000);
    const payload = buildMetaEvent({
      eventName: "Lead",
      eventId: "evt-1",
      sourceUrl: "https://tripmate.example/contact",
      user: { email: " A@B.com " },
      customData: { currency: "BDT", value: 1000 },
    });
    expect(payload.event_name).toBe("Lead");
    expect(payload.event_id).toBe("evt-1");
    expect(payload.action_source).toBe("website");
    expect(payload.event_source_url).toBe("https://tripmate.example/contact");
    expect(payload.custom_data).toEqual({ currency: "BDT", value: 1000 });
    expect(payload.user_data).toEqual({ em: [sha256("a@b.com")] });
    expect(payload.event_time).toBeGreaterThanOrEqual(before);
    expect(payload.event_time).toBeLessThanOrEqual(before + 5);
  });

  it("omits event_source_url / custom_data when not supplied", () => {
    const payload = buildMetaEvent({ eventName: "PageView", eventId: "e2" });
    expect(payload.event_source_url).toBeUndefined();
    expect(payload.custom_data).toBeUndefined();
    expect(payload.user_data).toEqual({});
  });

  it("defaults event_id to a uuid when none is supplied", () => {
    const payload = buildMetaEvent({ eventName: "PageView" });
    expect(payload.event_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("sendCapiEvent", () => {
  it("short-circuits with meta_not_configured when pixel/token are unset — no fetch", async () => {
    const res = await sendCapiEvent(minimalEvent());
    expect(res).toEqual({ ok: false, error: CAPI_STATUS.notConfigured });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws on a network failure", async () => {
    vi.stubEnv("META_PIXEL_ID", "123");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok");
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await sendCapiEvent(minimalEvent());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBeTruthy();
      expect(res.status).toBeUndefined();
    }
  });

  it("posts to the Meta Graph events endpoint built from META_GRAPH_VERSION, with an abort signal", async () => {
    vi.stubEnv("META_PIXEL_ID", "12345");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "secret-token");
    vi.stubEnv("META_CAPI_TEST_CODE", "ABC123");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ events_received: 1 }),
    });

    const event = minimalEvent({ event_id: "evt-1" });
    const res = await sendCapiEvent(event);
    expect(res).toMatchObject({ ok: true, status: 200 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0] as [string | URL, RequestInit];
    const href = String(input);
    // The endpoint URL is assembled from the exported version const, never a
    // second hard-coded literal that could drift from it.
    expect(META_GRAPH_VERSION).toMatch(/^v\d+\.\d+$/);
    expect(href).toContain(`https://graph.facebook.com/${META_GRAPH_VERSION}/12345/events`);
    expect(href).toContain("access_token=secret-token");
    expect(href).toContain("test_event_code=ABC123");
    expect((init.method ?? "GET").toUpperCase()).toBe("POST");
    // Every send is bounded by the 8s abort signal so a dead Meta never stalls
    // the public lead form.
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(init.body)) as { data: MetaEventPayload[] };
    expect(body.data).toEqual([event]);
  });

  it("returns ok:false meta_timeout when the request is aborted (Meta never responds)", async () => {
    vi.stubEnv("META_PIXEL_ID", "12345");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok");
    // AbortSignal.timeout aborts with a TimeoutError DOMException.
    fetchMock.mockRejectedValueOnce(
      new DOMException("The operation was aborted due to timeout", "TimeoutError"),
    );

    const res = await sendCapiEvent(minimalEvent());
    expect(res).toEqual({ ok: false, error: "meta_timeout" });
    if (!res.ok) expect(res.status).toBeUndefined();
  });

  it("returns ok:false with status/body on a non-2xx Meta response", async () => {
    vi.stubEnv("META_PIXEL_ID", "12345");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid token" } }),
    });

    const res = await sendCapiEvent(minimalEvent());
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.error).toBe("meta_http_error");
      expect(res.body).toEqual({ error: { message: "Invalid token" } });
    }
  });

  it("tolerates a non-JSON error body (still reports status)", async () => {
    vi.stubEnv("META_PIXEL_ID", "12345");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "tok");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });

    const res = await sendCapiEvent(minimalEvent());
    expect(res).toMatchObject({ ok: false, status: 502, error: "meta_http_error" });
  });
});
