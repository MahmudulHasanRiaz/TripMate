import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getFbCookies } from "@/lib/fb-cookies";
import {
  autoFieldKey,
  isStandardNameKey,
  isStandardPhoneKey,
  isReservedFieldKey,
  STANDARD_NAME_KEYS,
  STANDARD_PHONE_KEYS,
} from "@/lib/landing-helpers";
import { HONEYPOT_FIELD } from "@/modules/leads/validation";
import {
  RESERVED_FORM_FIELD_KEYS,
  buildLeadSchema,
} from "@/modules/landing-pages/section-types";
import type { FormConfig } from "@/modules/landing-pages/section-types";

describe("fb-cookies parser (getFbCookies)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty object in SSR or when document is undefined", () => {
    // When document is undefined (as in server-side execution)
    vi.stubGlobal("document", undefined);
    expect(getFbCookies()).toEqual({});
  });

  it("returns an empty object when document.cookie is empty", () => {
    vi.stubGlobal("document", { cookie: "" });
    expect(getFbCookies()).toEqual({});
  });

  it("returns an empty object when no fb cookies exist in document.cookie", () => {
    vi.stubGlobal("document", {
      cookie: "session_id=xyz123; user_theme=dark; csrftoken=abc890",
    });
    expect(getFbCookies()).toEqual({});
  });

  it("extracts _fbp cookie value accurately", () => {
    vi.stubGlobal("document", {
      cookie: "_fbp=fb.1.1712345678.987654321; session_id=xyz123",
    });
    expect(getFbCookies()).toEqual({
      fbp: "fb.1.1712345678.987654321",
    });
  });

  it("extracts _fbc cookie value accurately", () => {
    vi.stubGlobal("document", {
      cookie: "analytics=on; _fbc=fb.1.1712345678.AbCdEf123456",
    });
    expect(getFbCookies()).toEqual({
      fbc: "fb.1.1712345678.AbCdEf123456",
    });
  });

  it("extracts both _fbp and _fbc when both cookies are present", () => {
    vi.stubGlobal("document", {
      cookie:
        "utm_source=meta; _fbp=fb.1.1111.2222; other=val; _fbc=fb.1.3333.4444",
    });
    expect(getFbCookies()).toEqual({
      fbp: "fb.1.1111.2222",
      fbc: "fb.1.3333.4444",
    });
  });

  it("handles URL-encoded cookie values properly", () => {
    vi.stubGlobal("document", {
      cookie: "_fbc=fb.1.1234.%2B%20special%2Fchars",
    });
    expect(getFbCookies()).toEqual({
      fbc: "fb.1.1234.+ special/chars",
    });
  });
});

describe("landing builder field key auto-slugging and reserved key helpers", () => {
  it("maps common name labels to standard name keys", () => {
    expect(autoFieldKey("Full Name")).toBe("full_name");
    expect(autoFieldKey("fullname")).toBe("full_name");
    expect(autoFieldKey("Name")).toBe("name");
    expect(autoFieldKey("Your Name")).toBe("name");
    expect(autoFieldKey("Lead Name")).toBe("name");
  });

  it("maps common phone/mobile labels to standard phone keys", () => {
    expect(autoFieldKey("Phone")).toBe("phone");
    expect(autoFieldKey("Phone Number")).toBe("phone");
    expect(autoFieldKey("Phone No")).toBe("phone");
    expect(autoFieldKey("Mobile")).toBe("mobile");
    expect(autoFieldKey("Mobile Number")).toBe("mobile");
    expect(autoFieldKey("Telephone")).toBe("tel");
    expect(autoFieldKey("Tel")).toBe("tel");
  });

  it("maps common email labels to email key", () => {
    expect(autoFieldKey("Email")).toBe("email");
    expect(autoFieldKey("Email Address")).toBe("email");
  });

  it("sanitizes arbitrary labels into form-safe snake_case identifiers", () => {
    expect(autoFieldKey("Number of Travelers")).toBe("number_of_travelers");
    expect(autoFieldKey("Preferred Date (2026)!")).toBe("preferred_date_2026");
    expect(autoFieldKey("Special Inquiries & Requests")).toBe(
      "special_inquiries_requests",
    );
    expect(autoFieldKey("   ")).toBe("field");
  });

  it("verifies isStandardNameKey identifies all standard name keys", () => {
    for (const key of STANDARD_NAME_KEYS) {
      expect(isStandardNameKey(key)).toBe(true);
      expect(isStandardNameKey(key.toUpperCase())).toBe(true);
    }
    expect(isStandardNameKey("random_notes")).toBe(false);
    expect(isStandardNameKey("phone")).toBe(false);
  });

  it("verifies isStandardPhoneKey identifies all standard phone keys", () => {
    for (const key of STANDARD_PHONE_KEYS) {
      expect(isStandardPhoneKey(key)).toBe(true);
      expect(isStandardPhoneKey(key.toUpperCase())).toBe(true);
    }
    expect(isStandardPhoneKey("name")).toBe(false);
    expect(isStandardPhoneKey("email")).toBe(false);
  });

  it("verifies isReservedFieldKey flags honeypot keys", () => {
    expect(isReservedFieldKey("company_website")).toBe(true);
    expect(isReservedFieldKey("name")).toBe(false);
    expect(isReservedFieldKey("phone")).toBe(false);
  });
});

describe("honeypot safety and reserved collision guarantees", () => {
  it("ensures HONEYPOT_FIELD matches the documented key 'company_website'", () => {
    expect(HONEYPOT_FIELD).toBe("company_website");
  });

  it("ensures RESERVED_FORM_FIELD_KEYS contains HONEYPOT_FIELD to prevent authoring collisions", () => {
    expect(RESERVED_FORM_FIELD_KEYS).toContain(HONEYPOT_FIELD);
  });
});

describe("buildLeadSchema client & runtime validation mirroring", () => {
  const standardConfig: FormConfig = {
    title: "Campaign Consultation",
    subtitle: "Get in touch with us",
    fields: [
      {
        key: "name",
        label: "Full Name",
        type: "text",
        required: true,
      },
      {
        key: "phone",
        label: "Phone Number",
        type: "tel",
        required: true,
      },
      {
        key: "email",
        label: "Email Address",
        type: "email",
        required: false,
      },
      {
        key: "notes",
        label: "Additional Notes",
        type: "textarea",
        required: false,
      },
    ],
  };

  it("accepts a fully valid payload with name and phone", () => {
    const schema = buildLeadSchema(standardConfig);
    const result = schema.safeParse({
      name: "Ahmed Al-Farsi",
      phone: "+880 1712 345678",
      email: "ahmed@example.com",
      notes: "Looking for 5-star packages",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ahmed Al-Farsi");
      expect(result.data.phone).toBe("+880 1712 345678");
    }
  });

  it("rejects when a required field is missing or empty", () => {
    const schema = buildLeadSchema(standardConfig);
    const result = schema.safeParse({
      name: "   ",
      phone: "+880 1712 345678",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid telephone numbers", () => {
    const schema = buildLeadSchema(standardConfig);
    const result = schema.safeParse({
      name: "Ahmed Al-Farsi",
      phone: "invalid-phone",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid email address format if provided", () => {
    const schema = buildLeadSchema(standardConfig);
    const result = schema.safeParse({
      name: "Ahmed Al-Farsi",
      phone: "+880 1712 345678",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("enforces reachability guarantee when both phone and email are optional but neither is provided", () => {
    const optionalContactConfig: FormConfig = {
      title: "Quick Query",
      fields: [
        { key: "name", label: "Full Name", type: "text", required: true },
        { key: "phone", label: "Phone", type: "tel", required: false },
        { key: "email", label: "Email", type: "email", required: false },
      ],
    };

    const schema = buildLeadSchema(optionalContactConfig);
    const result = schema.safeParse({
      name: "Ahmed Al-Farsi",
      phone: "",
      email: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects when formConfig has zero fields configured", () => {
    const emptyConfig: FormConfig = {
      title: "No Fields",
      fields: [],
    };

    const schema = buildLeadSchema(emptyConfig);
    const result = schema.safeParse({});

    expect(result.success).toBe(false);
  });
});
