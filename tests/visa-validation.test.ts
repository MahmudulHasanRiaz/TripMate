import { describe, expect, it } from "vitest";
import {
  visaTypeInputSchema,
  visaServiceInputSchema,
  serviceOptionInputSchema,
  visaInquiryInputSchema,
} from "@/modules/catalog/visa-validation";

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";

describe("visaTypeInputSchema", () => {
  it("validates a valid visa type input", () => {
    const input = {
      name: "Tourist Visa",
      slug: "tourist-visa",
      description: "Standard tourist visa for leisure travel",
      isActive: true,
      sortOrder: 1,
    };
    const res = visaTypeInputSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Tourist Visa");
      expect(res.data.slug).toBe("tourist-visa");
    }
  });

  it("rejects invalid slugs with uppercase or special characters", () => {
    const res = visaTypeInputSchema.safeParse({
      name: "Tourist Visa",
      slug: "Tourist_Visa!",
    });
    expect(res.success).toBe(false);
  });

  it("requires a name", () => {
    const res = visaTypeInputSchema.safeParse({
      name: "",
      slug: "tourist-visa",
    });
    expect(res.success).toBe(false);
  });
});

describe("visaServiceInputSchema", () => {
  const baseService = {
    destinationId: UUID,
    visaTypeId: UUID,
    title: "Dubai 30 Days Tourist Visa",
    slug: "dubai-30-days-tourist-visa",
    entryType: "single_entry",
    validity: "60 Days",
    stayDuration: "30 Days",
    processingDays: "3-5 Working Days",
    price: 14500,
    costPrice: 11000,
    isActive: true,
  };

  it("validates a complete visa offering input", () => {
    const res = visaServiceInputSchema.safeParse(baseService);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.price).toBe(14500);
      expect(res.data.costPrice).toBe(11000);
    }
  });

  it("coerces string numbers for price and costPrice", () => {
    const res = visaServiceInputSchema.safeParse({
      ...baseService,
      price: "16000",
      costPrice: "12000",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.price).toBe(16000);
      expect(res.data.costPrice).toBe(12000);
    }
  });

  it("rejects negative prices", () => {
    const res = visaServiceInputSchema.safeParse({
      ...baseService,
      price: -100,
    });
    expect(res.success).toBe(false);
  });

  it("validates requirements string array", () => {
    const res = visaServiceInputSchema.safeParse({
      ...baseService,
      requirements: [
        "Passport scan with 6 months validity",
        "White background passport photo",
        "Confirmed return ticket",
      ],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.requirements).toHaveLength(3);
    }
  });
});

describe("serviceOptionInputSchema", () => {
  const baseOption = {
    categoryId: UUID,
    title: "Urgent Express Processing (24 Hours)",
    slug: "urgent-express-processing-24-hours",
    duration: "24 Hours",
    deliveryTime: "1 Day",
    price: 5000,
    costPrice: 3000,
    isActive: true,
    sortOrder: 1,
  };

  it("validates valid service option", () => {
    const res = serviceOptionInputSchema.safeParse(baseOption);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.price).toBe(5000);
      expect(res.data.costPrice).toBe(3000);
    }
  });

  it("rejects invalid slugs", () => {
    const res = serviceOptionInputSchema.safeParse({
      ...baseOption,
      slug: "Invalid Slug!",
    });
    expect(res.success).toBe(false);
  });
});

describe("visaInquiryInputSchema", () => {
  const baseInquiry = {
    visaServiceId: UUID,
    fullName: "Rahim Uddin",
    email: "rahim@example.com",
    phone: "01711223344",
    travelersCount: 2,
    passportNo: "A12345678",
    targetTravelDate: "2026-10-15",
    message: "Need urgent processing for family trip.",
  };

  it("validates public visa lead inquiry", () => {
    const res = visaInquiryInputSchema.safeParse(baseInquiry);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.fullName).toBe("Rahim Uddin");
      expect(res.data.travelersCount).toBe(2);
    }
  });

  it("rejects invalid emails", () => {
    const res = visaInquiryInputSchema.safeParse({
      ...baseInquiry,
      email: "invalid-email",
    });
    expect(res.success).toBe(false);
  });

  it("rejects short phone numbers", () => {
    const res = visaInquiryInputSchema.safeParse({
      ...baseInquiry,
      phone: "123",
    });
    expect(res.success).toBe(false);
  });
});
