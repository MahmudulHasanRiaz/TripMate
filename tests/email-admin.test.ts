import { describe, expect, it, vi } from "vitest";

// admin.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so this suite runs under vitest's node env — the same
// pattern as tests/settings-service.test.ts. The render fns themselves are
// pure react-dom/server renders (see tests/email-lead.test.ts /
// tests/email-order.test.ts), and formatMoney is pure Intl.
//
// The ACTION layer (admin-actions.ts) is deliberately not imported here: it
// pulls next/headers via the guard. withGuard/permission semantics are covered
// by tests/guard.test.ts + tests/permissions.test.ts; this suite pins the
// registry and the preview service contract.
vi.mock("server-only", () => ({}));

import { formatMoney } from "@/components/site/currency";
import {
  EmailAdminError,
  listEmailTemplates,
  renderEmailTemplatePreview,
} from "@/modules/email/admin";

const SHIPPED_TEMPLATE_IDS = [
  "lead-received",
  "lead-assigned",
  "order-confirm",
  "quote-ready",
  "payment-verified",
  "payment-rejected",
];

/** Assert fn throws an EmailAdminError with the expected code. */
function expectEmailAdminError(
  fn: () => unknown,
  code: EmailAdminError["code"],
): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EmailAdminError);
    expect((e as EmailAdminError).code).toBe(code);
    return;
  }
  expect.unreachable(`expected an EmailAdminError with code ${code}`);
}

describe("listEmailTemplates registry", () => {
  it("lists the six shipped templates with the exact ids", () => {
    const templates = listEmailTemplates();
    expect(templates).toHaveLength(6);
    expect(templates.map((t) => t.id).sort()).toEqual(
      [...SHIPPED_TEMPLATE_IDS].sort(),
    );
  });

  it("every entry carries complete, well-typed metadata", () => {
    for (const template of listEmailTemplates()) {
      expect(typeof template.id).toBe("string");
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(["customer", "staff"]).toContain(template.audience);
      // Params are non-empty and typed — the preview form renders from these.
      expect(template.params.length).toBeGreaterThan(0);
      for (const param of template.params) {
        expect(param.key.length).toBeGreaterThan(0);
        expect(["string", "number"]).toContain(param.type);
      }
    }
  });

  it("never leaks the render fn or sample params to the admin UI slice", () => {
    for (const template of listEmailTemplates()) {
      const asRecord = template as unknown as Record<string, unknown>;
      expect(asRecord.render).toBeUndefined();
      expect(asRecord.sampleParams).toBeUndefined();
    }
  });
});

describe("renderEmailTemplatePreview", () => {
  it("renders every registered template from its samples", () => {
    for (const template of listEmailTemplates()) {
      const out = renderEmailTemplatePreview(template.id);
      expect(typeof out.subject).toBe("string");
      expect(out.subject.length).toBeGreaterThan(0);
      expect(typeof out.html).toBe("string");
      // Every template renders the shared branded shell.
      expect(out.html).toContain("TripMate");
    }
  });

  it("treats missing and empty overrides identically (samples win)", () => {
    const without = renderEmailTemplatePreview("order-confirm");
    const withEmpty = renderEmailTemplatePreview("order-confirm", {});
    expect(withEmpty.subject).toBe(without.subject);
    expect(withEmpty.html).toBe(without.html);
  });

  it("merges string overrides into the render (subject + body)", () => {
    const out = renderEmailTemplatePreview("order-confirm", {
      orderNo: "TM-2026-0042",
    });
    expect(out.subject).toBe("Booking received — TM-2026-0042 (7-Day Umrah Package)");
    expect(out.html).toContain("TM-2026-0042");
    // Non-overridden sample params still render.
    expect(out.html).toContain("Ayesha Rahman");
  });

  it("coerces numeric overrides and formats them through the real money path", () => {
    const out = renderEmailTemplatePreview("quote-ready", {
      quotedPrice: "210000",
    });
    // formatMoney(210000, "BDT") — the same pure helper the template calls.
    expect(out.html).toContain(formatMoney(210000, "BDT"));
    // The sample amount no longer appears.
    expect(out.html).not.toContain(formatMoney(185000, "BDT"));
  });

  it("renders the sample URLs on the reserved .example TLD (never a real host)", () => {
    const order = renderEmailTemplatePreview("order-confirm");
    expect(order.html).toContain("tripmate.example/account/orders");
    const lead = renderEmailTemplatePreview("lead-assigned");
    expect(lead.html).toContain("tripmate.example/admin/leads");
  });

  it("rejects an unknown template id with NOT_FOUND", () => {
    expectEmailAdminError(
      () => renderEmailTemplatePreview("does-not-exist"),
      "NOT_FOUND",
    );
  });

  it("rejects override keys the template does not have, with a clear message", () => {
    expectEmailAdminError(
      () => renderEmailTemplatePreview("lead-received", { nope: "x" }),
      "UNKNOWN_PARAM",
    );
    // The message names the template's real params so a typo is self-explaining.
    try {
      renderEmailTemplatePreview("lead-received", { nope: "x" });
    } catch (e) {
      expect((e as EmailAdminError).message).toContain("name");
    }
  });

  it("rejects non-numeric values for numeric params with INVALID_PARAM", () => {
    expectEmailAdminError(
      () => renderEmailTemplatePreview("quote-ready", { quotedPrice: "not-a-number" }),
      "INVALID_PARAM",
    );
  });
});
