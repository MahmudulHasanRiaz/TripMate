import { describe, expect, it } from "vitest";
import { destinationInput } from "@/modules/catalog/validation";

describe("destinationInput validation", () => {
  it("validates a full destination with description, sortOrder, isFeatured, and seo", () => {
    const input = {
      name: "Makkah & Madinah",
      slug: "makkah-madinah",
      image: "/uploads/makkah.jpg",
      description: "The holiest sanctuaries of Islam with luxury hotel accommodations.",
      sortOrder: 1,
      isFeatured: true,
      isActive: true,
      seo: {
        title: "Hajj & Umrah in Makkah | TripMate",
        description: "Official agency packages for Hajj and Umrah.",
      },
    };

    const res = destinationInput.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Makkah & Madinah");
      expect(res.data.slug).toBe("makkah-madinah");
      expect(res.data.image).toBe("/uploads/makkah.jpg");
      expect(res.data.description).toBe(
        "The holiest sanctuaries of Islam with luxury hotel accommodations.",
      );
      expect(res.data.sortOrder).toBe(1);
      expect(res.data.isFeatured).toBe(true);
      expect(res.data.isActive).toBe(true);
      expect(res.data.seo).toEqual({
        title: "Hajj & Umrah in Makkah | TripMate",
        description: "Official agency packages for Hajj and Umrah.",
      });
    }
  });

  it("defaults sortOrder to 0 and isFeatured to false when omitted", () => {
    const input = {
      name: "Sylhet",
      slug: "sylhet",
    };

    const res = destinationInput.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.sortOrder).toBe(0);
      expect(res.data.isFeatured).toBe(false);
      expect(res.data.isActive).toBe(true);
      expect(res.data.description).toBeUndefined();
      expect(res.data.image).toBeUndefined();
      expect(res.data.seo).toBeUndefined();
    }
  });

  it("accepts null or empty description and image", () => {
    const res = destinationInput.safeParse({
      name: "Cox's Bazar",
      slug: "coxs-bazar",
      description: null,
      image: null,
      seo: null,
    });
    expect(res.success).toBe(true);
  });

  it("coerces sortOrder from string if needed", () => {
    const res = destinationInput.safeParse({
      name: "Dubai",
      slug: "dubai",
      sortOrder: 5,
      isFeatured: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.sortOrder).toBe(5);
    }
  });

  it("rejects invalid slugs", () => {
    const res = destinationInput.safeParse({
      name: "Invalid Destination",
      slug: "invalid slug with spaces",
    });
    expect(res.success).toBe(false);
  });
});
