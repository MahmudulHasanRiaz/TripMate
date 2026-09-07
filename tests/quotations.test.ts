import { describe, expect, it } from "vitest";
import {
  formatQuoteNo,
  quotationInputSchema,
  quotationItemInputSchema,
  quotationStatusInputSchema,
  convertQuotationInputSchema,
} from "@/modules/bookings/quotations-validation";

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";

describe("formatQuoteNo", () => {
  it("formats quote numbers with padding and year", () => {
    expect(formatQuoteNo(1, 2026)).toBe("QT-2026-0001");
    expect(formatQuoteNo(42, 2026)).toBe("QT-2026-0042");
    expect(formatQuoteNo(999, 2026)).toBe("QT-2026-0999");
  });
});

describe("quotationItemInputSchema", () => {
  it("validates valid quotation line item", () => {
    const item = {
      description: "Dubai 5-Star Hotel (3 Nights)",
      quantity: 2,
      unitPrice: 35000,
      unitCost: 28000,
    };
    const res = quotationItemInputSchema.safeParse(item);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.description).toBe("Dubai 5-Star Hotel (3 Nights)");
      expect(res.data.quantity).toBe(2);
      expect(res.data.unitPrice).toBe(35000);
      expect(res.data.unitCost).toBe(28000);
    }
  });

  it("rejects empty description", () => {
    const res = quotationItemInputSchema.safeParse({
      description: "   ",
      quantity: 1,
      unitPrice: 1000,
    });
    expect(res.success).toBe(false);
  });

  it("rejects negative price or cost", () => {
    expect(
      quotationItemInputSchema.safeParse({
        description: "Test Item",
        quantity: 1,
        unitPrice: -50,
      }).success,
    ).toBe(false);

    expect(
      quotationItemInputSchema.safeParse({
        description: "Test Item",
        quantity: 1,
        unitPrice: 100,
        unitCost: -20,
      }).success,
    ).toBe(false);
  });
});

describe("quotationInputSchema", () => {
  const baseQuote = {
    customerName: "Rahim Chowdhury",
    customerPhone: "01711223344",
    customerEmail: "rahim@example.com",
    notes: "Includes VIP lounge and airport meet & assist",
    items: [
      {
        description: "Executive Umrah Flight & Hotel",
        quantity: 2,
        unitPrice: 150000,
        unitCost: 120000,
      },
    ],
  };

  it("validates full quotation proposal", () => {
    const res = quotationInputSchema.safeParse(baseQuote);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.customerName).toBe("Rahim Chowdhury");
      expect(res.data.items).toHaveLength(1);
    }
  });

  it("rejects proposal without any line items", () => {
    const res = quotationInputSchema.safeParse({
      ...baseQuote,
      items: [],
    });
    expect(res.success).toBe(false);
  });

  it("allows empty or omitted email", () => {
    const res = quotationInputSchema.safeParse({
      ...baseQuote,
      customerEmail: "",
    });
    expect(res.success).toBe(true);
  });
});

describe("quotationStatusInputSchema & convertQuotationInputSchema", () => {
  it("validates status transitions", () => {
    expect(
      quotationStatusInputSchema.safeParse({
        id: UUID,
        status: "accepted",
      }).success,
    ).toBe(true);

    expect(
      quotationStatusInputSchema.safeParse({
        id: UUID,
        status: "invalid_status",
      }).success,
    ).toBe(false);
  });

  it("validates conversion input", () => {
    expect(
      convertQuotationInputSchema.safeParse({
        quotationId: UUID,
        note: "Customer confirmed via WhatsApp",
      }).success,
    ).toBe(true);
  });
});
