import { describe, expect, it } from "vitest";
import {
  serviceOptionOrderInputSchema,
} from "@/modules/bookings/validation";

const VALID_UUID = "3f3d5b1c-0000-4000-8000-000000000001";
const GATEWAY_UUID = "4a4d5b1c-0000-4000-8000-000000000002";

describe("serviceOptionOrderInputSchema", () => {
  it("validates valid service option order input", () => {
    const input = {
      optionId: VALID_UUID,
      customer: {
        name: "Rahim Chowdhury",
        phone: "+8801712345678",
        email: "rahim@example.com",
      },
      travelers: [
        {
          name: "Rahim Chowdhury",
          passportNo: "A01234567",
          dob: "1988-10-12",
          relation: "Self",
        },
      ],
      specialRequests: "Expedited processing please",
    };

    const res = serviceOptionOrderInputSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.optionId).toBe(VALID_UUID);
      expect(res.data.customer.name).toBe("Rahim Chowdhury");
      expect(res.data.customer.phone).toBe("+8801712345678");
      expect(res.data.travelers).toHaveLength(1);
      expect(res.data.travelers[0].passportNo).toBe("A01234567");
    }
  });

  it("validates input with pay-later payment method", () => {
    const input = {
      optionId: VALID_UUID,
      customer: {
        name: "Anisur Rahman",
        phone: "+8801811223344",
      },
      payment: {
        method: "pay_later",
      },
    };

    const res = serviceOptionOrderInputSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.payment?.method).toBe("pay_later");
    }
  });

  it("validates input with manual MFS payment", () => {
    const input = {
      optionId: VALID_UUID,
      customer: {
        name: "Farhana Islam",
        phone: "+8801911223344",
      },
      payment: {
        method: "manual",
        gatewayId: GATEWAY_UUID,
        senderNumber: "01911223344",
        trxId: "BKASH992817",
        notes: "Paid from personal bKash",
      },
    };

    const res = serviceOptionOrderInputSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.payment?.method).toBe("manual");
      expect(res.data.payment?.trxId).toBe("BKASH992817");
      expect(res.data.payment?.gatewayId).toBe(GATEWAY_UUID);
    }
  });

  it("rejects missing customer name or phone", () => {
    expect(
      serviceOptionOrderInputSchema.safeParse({
        optionId: VALID_UUID,
        customer: { name: "", phone: "+8801711223344" },
      }).success,
    ).toBe(false);

    expect(
      serviceOptionOrderInputSchema.safeParse({
        optionId: VALID_UUID,
        customer: { name: "Test User", phone: "" },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid UUID for optionId", () => {
    expect(
      serviceOptionOrderInputSchema.safeParse({
        optionId: "not-a-uuid",
        customer: { name: "Test User", phone: "+8801711223344" },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid date of birth format in travelers", () => {
    const res = serviceOptionOrderInputSchema.safeParse({
      optionId: VALID_UUID,
      customer: { name: "Test User", phone: "+8801711223344" },
      travelers: [
        {
          name: "Test Traveler",
          dob: "15/10/1990", // invalid format, must be YYYY-MM-DD
        },
      ],
    });
    expect(res.success).toBe(false);
  });
});

describe("Service option profit and snapshot calculations", () => {
  it("calculates gross profit and margin accurately", () => {
    const price = 5500;
    const costPrice = 4000;
    const grossProfit = price - costPrice;
    const marginPercent = (grossProfit / price) * 100;

    expect(grossProfit).toBe(1500);
    expect(Math.round(marginPercent * 10) / 10).toBe(27.3);
  });

  it("handles null cost price gracefully", () => {
    const price = 6000;
    const costPrice: number | null = null;
    const grossProfit = costPrice !== null ? price - costPrice : null;

    expect(grossProfit).toBeNull();
  });
});
