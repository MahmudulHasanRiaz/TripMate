import { describe, expect, it } from "vitest";
import {
  callChannelLink,
  instagramChannelLink,
  messengerChannelLink,
  resolveChatChannels,
  whatsappChannelLink,
} from "@/components/site/contact-channels";

// Pure-unit suite for the floating chat-widget link builders — the single
// place admin-configured channel values become URLs. No DB, no server-only.

describe("whatsappChannelLink", () => {
  it("builds https://wa.me/<digits> from a formatted number", () => {
    expect(whatsappChannelLink("+880 1700-000000")).toBe("https://wa.me/8801700000000");
  });

  it("appends the URL-encoded prefill when set", () => {
    expect(whatsappChannelLink("8801700000000", "Salam! Need help")).toBe(
      "https://wa.me/8801700000000?text=Salam!%20Need%20help",
    );
  });

  it("ignores a blank/whitespace-only prefill", () => {
    expect(whatsappChannelLink("8801700000000", "   ")).toBe("https://wa.me/8801700000000");
  });

  it("returns null when digitless (icon must hide, never emit a broken link)", () => {
    expect(whatsappChannelLink("")).toBeNull();
    expect(whatsappChannelLink("call me")).toBeNull();
  });
});

describe("messengerChannelLink", () => {
  it("builds https://m.me/<username> and strips a leading @", () => {
    expect(messengerChannelLink("@tripmate.travel")).toBe("https://m.me/tripmate.travel");
  });

  it("returns null for blank, URL-shaped or invalid values", () => {
    expect(messengerChannelLink("")).toBeNull();
    expect(messengerChannelLink("https://m.me/tripmate")).toBeNull();
    expect(messengerChannelLink("hello world")).toBeNull();
    expect(messengerChannelLink("a+b/c?d")).toBeNull();
  });
});

describe("callChannelLink", () => {
  it("builds tel:+<digits>", () => {
    expect(callChannelLink("+880 (02) 9015-0011")).toBe("tel:+8800290150011");
  });

  it("returns null when blank/digitless", () => {
    expect(callChannelLink("")).toBeNull();
    expect(callChannelLink("office")).toBeNull();
  });
});

describe("instagramChannelLink", () => {
  it("builds https://instagram.com/<handle> from @handle or bare handle", () => {
    expect(instagramChannelLink("@tripmate")).toBe("https://instagram.com/tripmate");
    expect(instagramChannelLink("tripmate.tours/")).toBe("https://instagram.com/tripmate.tours");
  });

  it("passes a full https URL through unchanged and refuses non-http schemes", () => {
    expect(instagramChannelLink("https://instagram.com/tripmate/")).toBe(
      "https://instagram.com/tripmate/",
    );
    expect(instagramChannelLink("javascript:alert(1)")).toBeNull();
    expect(instagramChannelLink("has space")).toBeNull();
  });

  it("returns null when blank", () => {
    expect(instagramChannelLink("")).toBeNull();
  });
});

describe("resolveChatChannels", () => {
  it("fans out in order: WhatsApp → Messenger → Call → Instagram", () => {
    const items = resolveChatChannels({
      whatsappNumber: "8801700000000",
      whatsappPrefill: null,
      messengerUsername: "tripmate",
      callNumber: "8801700000000",
      instagramHandle: "@tripmate",
    });
    expect(items.map((i) => i.key)).toEqual(["whatsapp", "messenger", "call", "instagram"]);
  });

  it("skips unconfigured channels and hides the widget when nothing is set", () => {
    const items = resolveChatChannels({
      whatsappNumber: "",
      whatsappPrefill: null,
      messengerUsername: "",
      callNumber: "+8801700000000",
      instagramHandle: "",
    });
    expect(items.map((i) => i.key)).toEqual(["call"]);
    expect(
      resolveChatChannels({ whatsappNumber: "", whatsappPrefill: null, messengerUsername: "", callNumber: "", instagramHandle: "" }),
    ).toEqual([]);
  });
});
