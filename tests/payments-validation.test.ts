import { describe, expect, it } from "vitest";
import {
  GATEWAY_CONFIG_MAX_ENTRIES,
  GATEWAY_KINDS,
  MANUALLY_PAYABLE_GATEWAY_KINDS,
  PAYMENT_STATUSES,
  adminCreatePaymentInputSchema,
  amountInputSchema,
  gatewayConfigSchema,
  gatewayInputSchema,
  gatewayKindSchema,
  isManuallyPayableGatewayKind,
  paymentStatusSchema,
  paymentSubmitInputSchema,
  uuidSchema,
} from "@/modules/payments/validation";
import { gatewayKindEnum, paymentStatusEnum } from "@/modules/payments/schema";

// Pure-unit suite for the payments validation layer. No DB, no server-only
// imports — validation.ts is zod-only so it runs anywhere. The drizzle schema
// import is also pure (pg-core table builders only) and lets the suite assert
// the enums never drift from the database's (the same contract as the
// bookings-validation suite).

const UUID = "3f3d5b1c-0000-4000-8000-000000000002";

describe("gateway kind enum", () => {
  it("exposes the five gateway kinds and rejects others", () => {
    expect(GATEWAY_KINDS).toEqual(["manual", "paylater", "sslcommerz", "bkash", "nagad"]);
    for (const kind of GATEWAY_KINDS) {
      expect(gatewayKindSchema.safeParse(kind).success).toBe(true);
    }
    expect(gatewayKindSchema.safeParse("stripe").success).toBe(false);
    expect(gatewayKindSchema.safeParse("").success).toBe(false);
    expect(gatewayKindSchema.safeParse(42).success).toBe(false);
  });

  it("stays in sync with the gateway_kind pg enum", () => {
    expect([...GATEWAY_KINDS]).toEqual(gatewayKindEnum.enumValues);
  });
});

describe("manually payable gateway kinds", () => {
  it("covers manual/bkash/nagad and excludes paylater/sslcommerz", () => {
    expect([...MANUALLY_PAYABLE_GATEWAY_KINDS]).toEqual(["manual", "bkash", "nagad"]);
    expect(isManuallyPayableGatewayKind("manual")).toBe(true);
    expect(isManuallyPayableGatewayKind("bkash")).toBe(true);
    expect(isManuallyPayableGatewayKind("nagad")).toBe(true);
    expect(isManuallyPayableGatewayKind("paylater")).toBe(false);
    expect(isManuallyPayableGatewayKind("sslcommerz")).toBe(false);
  });
});

describe("payment status enum", () => {
  it("exposes the five payment statuses and rejects others", () => {
    expect(PAYMENT_STATUSES).toEqual(["pending", "submitted", "verified", "rejected", "refunded"]);
    for (const status of PAYMENT_STATUSES) {
      expect(paymentStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(paymentStatusSchema.safeParse("paid").success).toBe(false);
    expect(paymentStatusSchema.safeParse("SUBMITTED").success).toBe(false);
  });

  it("stays in sync with the payment_status pg enum", () => {
    expect([...PAYMENT_STATUSES]).toEqual(paymentStatusEnum.enumValues);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid uuid and rejects malformed ids", () => {
    expect(uuidSchema.safeParse(UUID).success).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
    expect(uuidSchema.safeParse(123).success).toBe(false);
  });
});

describe("paymentSubmitInputSchema", () => {
  const payload = {
    orderId: UUID,
    gatewayId: UUID,
    methodTxnId: "TXN8H2K9QL",
    senderNumber: "+8801712345678",
    screenshotUrl: "https://cdn.example.com/receipt.png",
    note: "Paid from my personal bKash",
  };

  it("accepts a full submission and a bare one (txn id only)", () => {
    const parsed = paymentSubmitInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.methodTxnId).toBe("TXN8H2K9QL");
      expect(parsed.data.senderNumber).toBe("+8801712345678");
    }
    expect(paymentSubmitInputSchema.safeParse({
      orderId: UUID,
      gatewayId: UUID,
      methodTxnId: "TXN8H2K9QL",
    }).success).toBe(true);
  });

  it("requires uuid orderId/gatewayId and trims the txn id", () => {
    expect(paymentSubmitInputSchema.safeParse({ ...payload, orderId: "abc" }).success).toBe(false);
    expect(paymentSubmitInputSchema.safeParse({ ...payload, gatewayId: 7 }).success).toBe(false);
    const trimmed = paymentSubmitInputSchema.safeParse({
      ...payload,
      methodTxnId: "  TXN8H2K9QL  ",
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.methodTxnId).toBe("TXN8H2K9QL");
  });

  it("bounds methodTxnId at 4-64 characters", () => {
    expect(paymentSubmitInputSchema.safeParse({ ...payload, methodTxnId: "ABC" }).success).toBe(
      false,
    );
    expect(paymentSubmitInputSchema.safeParse({ ...payload, methodTxnId: "ABCD" }).success).toBe(
      true,
    );
    expect(
      paymentSubmitInputSchema.safeParse({ ...payload, methodTxnId: "T".repeat(64) }).success,
    ).toBe(true);
    expect(
      paymentSubmitInputSchema.safeParse({ ...payload, methodTxnId: "T".repeat(65) }).success,
    ).toBe(false);
  });

  it("caps senderNumber at 30 and note at 1000, treating blanks as absent", () => {
    expect(
      paymentSubmitInputSchema.safeParse({ ...payload, senderNumber: "s".repeat(31) }).success,
    ).toBe(false);
    expect(paymentSubmitInputSchema.safeParse({ ...payload, note: "n".repeat(1001) }).success).toBe(
      false,
    );
    const blank = paymentSubmitInputSchema.safeParse({
      ...payload,
      senderNumber: "   ",
      note: "",
    });
    expect(blank.success).toBe(true);
    if (blank.success) {
      expect(blank.data.senderNumber).toBeUndefined();
      expect(blank.data.note).toBeUndefined();
    }
  });

  it("accepts an http(s) screenshot URL, blanks as absent, and refuses other schemes", () => {
    expect(paymentSubmitInputSchema.safeParse({ ...payload, screenshotUrl: "http://example.com/r.png" }).success).toBe(true);
    const blank = paymentSubmitInputSchema.safeParse({ ...payload, screenshotUrl: "  " });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.screenshotUrl).toBeUndefined();
    // javascript:/data: URLs parse as URLs but must never be stored (the value
    // is rendered back to operators).
    expect(
      paymentSubmitInputSchema.safeParse({
        ...payload,
        screenshotUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      paymentSubmitInputSchema.safeParse({ ...payload, screenshotUrl: "data:text/html;base64,AAAA" })
        .success,
    ).toBe(false);
    expect(paymentSubmitInputSchema.safeParse({ ...payload, screenshotUrl: "not a url" }).success).toBe(
      false,
    );
  });
});

describe("adminCreatePaymentInputSchema", () => {
  it("is the submit schema without the screenshot field (silently dropped)", () => {
    const parsed = adminCreatePaymentInputSchema.safeParse({
      orderId: UUID,
      gatewayId: UUID,
      methodTxnId: "BANK-DEP-77",
      senderNumber: "+8801812345678",
      note: "Walk-in bank deposit",
      screenshotUrl: "https://example.com/should-be-dropped.png",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("screenshotUrl");
      expect(parsed.data.note).toBe("Walk-in bank deposit");
    }
  });
});

describe("gatewayConfigSchema", () => {
  it("accepts a flat record of display strings", () => {
    const parsed = gatewayConfigSchema.safeParse({
      accountType: "personal",
      number: "+8801000000000",
      bankName: "Example Bank",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-string values, non-object config, and empty keys", () => {
    expect(gatewayConfigSchema.safeParse({ number: 8801000000000 }).success).toBe(false);
    expect(gatewayConfigSchema.safeParse(["personal"]).success).toBe(false);
    expect(gatewayConfigSchema.safeParse("personal").success).toBe(false);
    expect(gatewayConfigSchema.safeParse({ "": "value" }).success).toBe(false);
  });

  it("caps entries at the documented limit", () => {
    const config: Record<string, string> = {};
    for (let i = 0; i <= GATEWAY_CONFIG_MAX_ENTRIES; i++) config[`k${i}`] = "v";
    expect(gatewayConfigSchema.safeParse(config).success).toBe(false);
  });
});

describe("gatewayInputSchema", () => {
  const payload = {
    name: "bKash (Manual)",
    kind: "manual",
    config: { accountType: "personal", number: "+8801000000000" },
    instructions: "Send the amount to the bKash number, then submit the transaction ID.",
    isActive: true,
    sortOrder: 1,
  };

  it("accepts a full gateway payload", () => {
    const parsed = gatewayInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe("manual");
      expect(parsed.data.config.number).toBe("+8801000000000");
    }
  });

  it("accepts an optional id (update) and rejects malformed ones", () => {
    expect(gatewayInputSchema.safeParse({ ...payload, id: UUID }).success).toBe(true);
    expect(gatewayInputSchema.safeParse({ ...payload, id: "abc" }).success).toBe(false);
  });

  it("bounds the name at 1-100 and instructions at 2000", () => {
    expect(gatewayInputSchema.safeParse({ ...payload, name: "" }).success).toBe(false);
    expect(gatewayInputSchema.safeParse({ ...payload, name: "n".repeat(101) }).success).toBe(false);
    expect(gatewayInputSchema.safeParse({ ...payload, name: "n".repeat(100) }).success).toBe(true);
    expect(
      gatewayInputSchema.safeParse({ ...payload, instructions: "i".repeat(2001) }).success,
    ).toBe(false);
    expect(
      gatewayInputSchema.safeParse({ ...payload, instructions: "i".repeat(2000) }).success,
    ).toBe(true);
  });

  it("rejects unknown kinds and bounds sortOrder at an int 0-99", () => {
    expect(gatewayInputSchema.safeParse({ ...payload, kind: "rocket" }).success).toBe(false);
    for (const sortOrder of [-1, 100, 1.5, "abc"]) {
      expect(gatewayInputSchema.safeParse({ ...payload, sortOrder }).success).toBe(false);
    }
    for (const sortOrder of [0, 42, 99, "7"]) {
      expect(gatewayInputSchema.safeParse({ ...payload, sortOrder }).success).toBe(true);
    }
  });

  it("defaults isActive/sortOrder/config when omitted and refuses non-boolean isActive", () => {
    const parsed = gatewayInputSchema.safeParse({ name: "Bank Transfer", kind: "manual" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(true);
      expect(parsed.data.sortOrder).toBe(0);
      expect(parsed.data.config).toEqual({});
    }
    expect(gatewayInputSchema.safeParse({ ...payload, isActive: "true" }).success).toBe(false);
  });

  it("refuses a non-http(s) logoUrl", () => {
    expect(gatewayInputSchema.safeParse({ ...payload, logoUrl: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(
      gatewayInputSchema.safeParse({ ...payload, logoUrl: "https://example.com/logo.svg" }).success,
    ).toBe(true);
  });
});

describe("amountInputSchema", () => {
  it("accepts positive amounts, coercing numeric strings", () => {
    for (const amount of [0.01, 10, 10.5, 10.25, 1500, 999999999999.99, "50.25"]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(true);
    }
  });

  it("rejects zero, negatives, non-finite and non-numeric values", () => {
    for (const amount of [0, -1, -0.01, NaN, Infinity, -Infinity, "abc", null]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(false);
    }
  });

  it("rejects amounts above the numeric(14,2) cap", () => {
    expect(amountInputSchema.safeParse(1e12 + 0.01).success).toBe(false);
    expect(amountInputSchema.safeParse(1e13).success).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    for (const amount of [10.123, 0.005, 1500.999, "20.555"]) {
      expect(amountInputSchema.safeParse(amount).success).toBe(false);
    }
  });
});
