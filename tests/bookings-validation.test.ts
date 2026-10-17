import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_SOURCES,
  ORDER_TYPES,
  ORDER_STATUS_TRANSITIONS,
  ORDER_NO_REGEX,
  TERMINAL_ORDER_STATUSES,
  convertLeadOrderInputSchema,
  customerInputSchema,
  formatOrderNo,
  inquiryHasReachableContact,
  inquiryOrderInputSchema,
  isLegalOrderTransition,
  orderSourceSchema,
  orderStatusSchema,
  orderTypeSchema,
  packageOrderInputSchema,
  travelerInputSchema,
  travelersSchema,
  uuidSchema,
  validateInquiryExtraFields,
} from "@/modules/bookings/validation";
import {
  orderSourceEnum,
  orderStatusEnum,
  orderTypeEnum,
} from "@/modules/bookings/schema";

// Pure-unit suite for the bookings validation layer. No DB, no server-only
// imports — validation.ts is zod-only (+ the pure landing-pages section types)
// so it runs anywhere. The drizzle schema import below is also pure (pg-core
// table builders only) and lets the suite assert the enums never drift from
// the database's.

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";

describe("order status enum", () => {
  it("exposes the four pipeline statuses (§2.7)", () => {
    expect(ORDER_STATUSES).toEqual([
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ]);
  });

  it("accepts every documented status and rejects others", () => {
    for (const status of ORDER_STATUSES) {
      expect(orderStatusSchema.safeParse(status).success).toBe(true);
    }
    expect(orderStatusSchema.safeParse("deleted").success).toBe(false);
    expect(orderStatusSchema.safeParse("").success).toBe(false);
    expect(orderStatusSchema.safeParse(42).success).toBe(false);
  });

  it("stays in sync with the order_status pg enum", () => {
    expect([...ORDER_STATUSES]).toEqual(orderStatusEnum.enumValues);
  });
});

describe("order type enum", () => {
  it("exposes package / inquiry / service and rejects others", () => {
    expect(ORDER_TYPES).toEqual(["package", "inquiry", "service"]);
    for (const type of ORDER_TYPES) {
      expect(orderTypeSchema.safeParse(type).success).toBe(true);
    }
    expect(orderTypeSchema.safeParse("subscription").success).toBe(false);
  });

  it("stays in sync with the order_type pg enum", () => {
    expect([...ORDER_TYPES]).toEqual(orderTypeEnum.enumValues);
  });
});

describe("order source enum", () => {
  it("exposes website / lead_conversion / manual and rejects others", () => {
    expect(ORDER_SOURCES).toEqual(["website", "lead_conversion", "manual"]);
    for (const source of ORDER_SOURCES) {
      expect(orderSourceSchema.safeParse(source).success).toBe(true);
    }
    expect(orderSourceSchema.safeParse("walk-in").success).toBe(false);
    expect(orderSourceSchema.safeParse("LEAD_CONVERSION").success).toBe(false);
  });

  it("stays in sync with the order_source pg enum", () => {
    expect([...ORDER_SOURCES]).toEqual(orderSourceEnum.enumValues);
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

describe("customerInputSchema (package orders)", () => {
  it("accepts a full contact and a phone-only contact", () => {
    expect(
      customerInputSchema.safeParse({
        name: "Rahim Uddin",
        email: "rahim@example.com",
        phone: "+8801712345678",
      }).success,
    ).toBe(true);
    expect(
      customerInputSchema.safeParse({ name: "Rahim Uddin", phone: "01712345678" }).success,
    ).toBe(true);
  });

  it("requires a name (1-200) and a phone (5-20)", () => {
    expect(customerInputSchema.safeParse({ name: "", phone: "01712345678" }).success).toBe(false);
    expect(
      customerInputSchema.safeParse({ name: "x".repeat(201), phone: "01712345678" }).success,
    ).toBe(false);
    expect(customerInputSchema.safeParse({ name: "Rahim", phone: "1234" }).success).toBe(false);
    expect(customerInputSchema.safeParse({ name: "Rahim", phone: "1".repeat(21) }).success).toBe(
      false,
    );
  });

  it("treats a blank email as absent but rejects a malformed one", () => {
    const blank = customerInputSchema.safeParse({ name: "Rahim", phone: "01712345678", email: "  " });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.email).toBeUndefined();
    expect(
      customerInputSchema.safeParse({ name: "Rahim", phone: "01712345678", email: "nope" })
        .success,
    ).toBe(false);
  });
});

describe("travelerInputSchema + travelersSchema", () => {
  const traveler = { name: "Karim Uddin", passportNo: "BX0123456", dob: "1990-05-01", relation: "spouse" };

  it("accepts a full traveler and a name-only traveler", () => {
    expect(travelerInputSchema.safeParse(traveler).success).toBe(true);
    expect(travelerInputSchema.safeParse({ name: "Karim" }).success).toBe(true);
  });

  it("caps passportNo at 30 and relation at 50, and shape-checks dob", () => {
    expect(travelerInputSchema.safeParse({ ...traveler, passportNo: "P".repeat(31) }).success).toBe(
      false,
    );
    expect(travelerInputSchema.safeParse({ ...traveler, relation: "r".repeat(51) }).success).toBe(
      false,
    );
    expect(travelerInputSchema.safeParse({ ...traveler, dob: "01-05-1990" }).success).toBe(false);
    expect(travelerInputSchema.safeParse({ ...traveler, dob: "1990-5-1" }).success).toBe(false);
  });

  it("bounds the manifest at 1-10 travelers", () => {
    expect(travelersSchema.safeParse([]).success).toBe(false);
    expect(travelersSchema.safeParse([{ name: "Karim" }]).success).toBe(true);
    expect(travelersSchema.safeParse(Array.from({ length: 10 }, () => ({ name: "K" }))).success).toBe(
      true,
    );
    expect(travelersSchema.safeParse(Array.from({ length: 11 }, () => ({ name: "K" }))).success).toBe(
      false,
    );
  });
});

describe("packageOrderInputSchema", () => {
  const payload = {
    listingId: UUID,
    customer: { name: "Rahim Uddin", phone: "+8801712345678" },
    travelers: [{ name: "Rahim Uddin" }, { name: "Karim Uddin", dob: "1992-11-30" }],
    specialRequests: "Vegetarian meals, airport pickup",
  };

  it("accepts a full booking payload", () => {
    const parsed = packageOrderInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.listingId).toBe(UUID);
      expect(parsed.data.travelers).toHaveLength(2);
    }
  });

  it("rejects a malformed listingId, missing customer, and oversized specialRequests", () => {
    expect(packageOrderInputSchema.safeParse({ ...payload, listingId: "abc" }).success).toBe(false);
    expect(packageOrderInputSchema.safeParse({ ...payload, customer: undefined }).success).toBe(
      false,
    );
    expect(
      packageOrderInputSchema.safeParse({ ...payload, specialRequests: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("inquiryOrderInputSchema", () => {
  it("requires a phone OR an email (each individually optional)", () => {
    expect(inquiryOrderInputSchema.safeParse({ name: "Salam", phone: "01712345678" }).success).toBe(
      true,
    );
    expect(inquiryOrderInputSchema.safeParse({ name: "Salam", email: "s@example.com" }).success).toBe(
      true,
    );
    const neither = inquiryOrderInputSchema.safeParse({ name: "Salam" });
    expect(neither.success).toBe(false);
    if (!neither.success) {
      expect(neither.error.issues.some((i) => i.path[0] === "phone")).toBe(true);
    }
  });

  it("requires a name and bounds details", () => {
    expect(inquiryOrderInputSchema.safeParse({ phone: "01712345678" }).success).toBe(false);
    expect(
      inquiryOrderInputSchema.safeParse({ name: "Salam", phone: "01712345678", details: "d".repeat(4000) })
        .success,
    ).toBe(true);
    expect(
      inquiryOrderInputSchema.safeParse({ name: "Salam", phone: "01712345678", details: "d".repeat(4001) })
        .success,
    ).toBe(false);
  });

  it("bounds extraFields keys, values and count", () => {
    const base = { name: "Salam", phone: "01712345678" };
    expect(
      inquiryOrderInputSchema.safeParse({ ...base, extraFields: { ["".padStart(121, "k")]: "v" } })
        .success,
    ).toBe(false);
    expect(
      inquiryOrderInputSchema.safeParse({ ...base, extraFields: { note: "v".repeat(4001) } }).success,
    ).toBe(false);
    const tooMany: Record<string, string> = {};
    for (let i = 0; i < 51; i++) tooMany[`f${i}`] = "v";
    expect(inquiryOrderInputSchema.safeParse({ ...base, extraFields: tooMany }).success).toBe(false);
  });

  it("exposes the reachability predicate used by the conversion union", () => {
    expect(inquiryHasReachableContact({ phone: "01712345678" })).toBe(true);
    expect(inquiryHasReachableContact({ email: "a@b.co" })).toBe(true);
    expect(inquiryHasReachableContact({ phone: "", email: " " })).toBe(false);
    expect(inquiryHasReachableContact({})).toBe(false);
  });
});

describe("convertLeadOrderInputSchema", () => {
  it("accepts a typed package payload", () => {
    const parsed = convertLeadOrderInputSchema.safeParse({
      type: "package",
      listingId: UUID,
      customer: { name: "Rahim", phone: "01712345678" },
      travelers: [{ name: "Rahim" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "package") {
      expect(parsed.data.travelers).toHaveLength(1);
    }
  });

  it("accepts a typed inquiry payload with contact", () => {
    const parsed = convertLeadOrderInputSchema.safeParse({
      type: "inquiry",
      name: "Salam",
      email: "s@example.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "inquiry") {
      expect(parsed.data.email).toBe("s@example.com");
    }
  });

  it("rejects an inquiry without contact, and unknown types", () => {
    expect(convertLeadOrderInputSchema.safeParse({ type: "inquiry", name: "Salam" }).success).toBe(
      false,
    );
    expect(convertLeadOrderInputSchema.safeParse({ type: "manual", name: "X" }).success).toBe(false);
    expect(convertLeadOrderInputSchema.safeParse({ name: "No type" }).success).toBe(false);
  });
});

describe("status transition map", () => {
  it("allows the documented pipeline moves", () => {
    const legal: [string, string][] = [
      ["pending", "confirmed"],
      ["confirmed", "completed"],
    ];
    for (const [from, to] of legal) {
      expect(isLegalOrderTransition(from as never, to as never)).toBe(true);
    }
  });

  it("allows cancel from every non-terminal status only", () => {
    for (const from of ["pending", "confirmed"] as const) {
      expect(isLegalOrderTransition(from, "cancelled")).toBe(true);
    }
    expect(isLegalOrderTransition("cancelled", "cancelled")).toBe(false);
    expect(isLegalOrderTransition("completed", "cancelled")).toBe(false);
  });

  it("allows complete only from confirmed", () => {
    for (const from of ORDER_STATUSES) {
      expect(isLegalOrderTransition(from, "completed")).toBe(from === "confirmed");
    }
  });

  it("makes cancelled/completed terminal and blocks the illegal shortcuts", () => {
    expect(TERMINAL_ORDER_STATUSES).toEqual(["cancelled", "completed"]);
    const illegal: [string, string][] = [
      ["pending", "completed"],
      ["confirmed", "pending"],
      ["cancelled", "pending"],
      ["completed", "pending"],
    ];
    for (const [from, to] of illegal) {
      expect(isLegalOrderTransition(from as never, to as never)).toBe(false);
    }
    // Every non-terminal status has at least one legal exit; terminals none.
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.completed).toEqual([]);
  });
});

describe("order number format", () => {
  it("matches TM-YYYY-NNNNN and rejects near-misses", () => {
    expect(ORDER_NO_REGEX.test("TM-2026-00001")).toBe(true);
    expect(ORDER_NO_REGEX.test("TM-2027-99999")).toBe(true);
    expect(ORDER_NO_REGEX.test("TM-2026-123456")).toBe(true); // grows past 99999
    expect(ORDER_NO_REGEX.test("TM-26-00001")).toBe(false);
    expect(ORDER_NO_REGEX.test("TM-2026-1")).toBe(false);
    expect(ORDER_NO_REGEX.test("tm-2026-00001")).toBe(false);
    expect(ORDER_NO_REGEX.test("ORD-2026-00001")).toBe(false);
    expect(ORDER_NO_REGEX.test("TM-2026-0000A")).toBe(false);
  });

  it("zero-pads the sequence to five digits", () => {
    expect(formatOrderNo(2026, 1)).toBe("TM-2026-00001");
    expect(formatOrderNo(2026, 42)).toBe("TM-2026-00042");
    expect(formatOrderNo(2026, 99999)).toBe("TM-2026-99999");
    expect(formatOrderNo(2026, 100000)).toBe("TM-2026-100000");
  });
});

describe("validateInquiryExtraFields (listing formConfig)", () => {
  const formConfig = {
    title: "Visa help",
    fields: [
      { key: "destination", label: "Destination", type: "text", required: true },
      {
        key: "travel_date",
        label: "Travel date",
        type: "date",
        required: false,
      },
    ],
  };

  it("validates extras against a FormConfig and strips undeclared keys", () => {
    const result = validateInquiryExtraFields(formConfig, {
      destination: "Dubai",
      travel_date: "",
      sneaky: "dropped",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ destination: "Dubai", travel_date: "" });
    }
  });

  it("fails with field-keyed errors when a required form field is missing", () => {
    const result = validateInquiryExtraFields(formConfig, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.destination).toBeDefined();
    }
  });

  it("treats a non-FormConfig formConfig as absent and rejects extras then", () => {
    const noConfig = validateInquiryExtraFields(null, undefined);
    expect(noConfig.ok).toBe(true);
    if (noConfig.ok) expect(noConfig.data).toEqual({});

    const malformed = validateInquiryExtraFields({ fields: "nonsense" }, { a: "b" });
    expect(malformed.ok).toBe(false);

    const extrasWithoutForm = validateInquiryExtraFields(null, { a: "b" });
    expect(extrasWithoutForm.ok).toBe(false);
  });

  it("accepts empty extras when a FormConfig's fields are all optional-blank", () => {
    const optionalOnly = {
      fields: [{ key: "notes", label: "Notes", type: "textarea", required: false }],
    };
    const result = validateInquiryExtraFields(optionalOnly, {});
    expect(result.ok).toBe(true);
  });

  it("does NOT apply buildLeadSchema's landing reachability rule (documented divergence)", () => {
    // A landing form must carry a filled email/tel field (it is the lead's only
    // contact path); an inquiry's reachability is the structured phone-or-email
    // rule, so a blank optional tel here must NOT fail on its own.
    const withTel = {
      fields: [
        { key: "destination", label: "Destination", type: "text", required: true },
        { key: "tel", label: "Phone", type: "tel", required: false },
      ],
    };
    const result = validateInquiryExtraFields(withTel, { destination: "Dubai", tel: "" });
    expect(result.ok).toBe(true);
  });

  it("still applies the per-field content rules (a filled tel must look like a phone)", () => {
    const withTel = {
      fields: [{ key: "tel", label: "Phone", type: "tel", required: false }],
    };
    const result = validateInquiryExtraFields(withTel, { tel: "call me" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.tel).toBeDefined();
    }
  });
});
