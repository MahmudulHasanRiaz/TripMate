import { describe, it, expect } from "vitest";
import { telLink, whatsappLink } from "@/components/site/currency";

describe("contact link helpers", () => {
  it("builds wa.me / tel: links from an international phone", () => {
    expect(whatsappLink("+8801700000000")).toBe("https://wa.me/8801700000000");
    expect(telLink("+8801700000000")).toBe("tel:+8801700000000");
  });

  it("strips spaces/punctuation while keeping the country code", () => {
    expect(whatsappLink("+880 1700 000000")).toBe("https://wa.me/8801700000000");
    expect(telLink("+1 (800) 555-0100")).toBe("tel:+18005550100");
  });

  it("returns null for a phone with no digits", () => {
    for (const phone of ["", "   ", "N/A", "+()", "Landline only"]) {
      expect(whatsappLink(phone)).toBeNull();
      expect(telLink(phone)).toBeNull();
    }
  });
});
