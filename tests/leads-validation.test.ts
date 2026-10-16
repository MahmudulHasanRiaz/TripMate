import { describe, expect, it } from "vitest";
import {
  HONEYPOT_FIELD,
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadSourceSchema,
  leadStatusSchema,
  uuidSchema,
} from "@/modules/leads/validation";

// Pure-unit suite for the leads validation layer. No DB, no server-only
// imports — validation.ts is zod-only so it runs anywhere.

describe("lead status enum", () => {
  it("exposes the seven documented pipeline statuses (§2.6)", () => {
    expect(LEAD_STATUSES).toEqual([
      "new",
      "contacted",
      "qualified",
      "negotiating",
      "follow_up",
      "converted",
      "lost",
    ]);
  });

  it("accepts every documented status and rejects others", () => {
    for (const status of LEAD_STATUSES) {
      expect(leadStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(leadStatusSchema.safeParse("deleted").success).toBe(false);
    expect(leadStatusSchema.safeParse("").success).toBe(false);
    expect(leadStatusSchema.safeParse(42).success).toBe(false);
  });
});

describe("lead source enum", () => {
  it("exposes the documented sources (§2.6)", () => {
    expect(LEAD_SOURCES).toEqual([
      "landing",
      "organic",
      "manual",
      "direct",
      "referral",
      "facebook",
      "instagram",
      "tiktok",
      "other",
    ]);
  });

  it("accepts landing/organic/manual and rejects others", () => {
    for (const source of LEAD_SOURCES) {
      expect(leadSourceSchema.safeParse(source).success).toBe(true);
    }
    expect(leadSourceSchema.safeParse("walk-in").success).toBe(false);
    expect(leadSourceSchema.safeParse("LANDING").success).toBe(false);
  });
});

describe("honeypot field", () => {
  it("is the documented hidden field name", () => {
    expect(HONEYPOT_FIELD).toBe("company_website");
  });
});

describe("uuidSchema", () => {
  it("accepts a valid uuid and rejects malformed ids", () => {
    expect(uuidSchema.safeParse("3f3d5b1c-0000-4000-8000-000000000001").success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
    expect(uuidSchema.safeParse(123).success).toBe(false);
  });
});
