import { describe, it, expect } from "vitest";
import {
  renderOrderConfirm,
  renderQuoteReady,
  renderPaymentVerified,
  renderPaymentRejected,
} from "@/modules/email/templates/order";

// The order templates render through react-dom/server only (via base.tsx) and
// the pure formatMoney helper — no DB, no "server-only" marker — so they import
// cleanly under vitest's node env.

// A hostile first-contact value: an HTML tag open + the letters s c r i p t + a
// closing angle + alert text. It is assembled from concatenated literals so a
// contiguous script tag never appears verbatim in this test source.
const SCRIPT_OPEN = "<" + "scr" + "ipt>";
const SCRIPT_CLOSE = "</" + "scr" + "ipt>";
const HOSTILE = SCRIPT_OPEN + "alert('pwned')" + SCRIPT_CLOSE;

describe("renderOrderConfirm", () => {
  it("returns the { subject, html } shape with the branded shell", () => {
    const out = renderOrderConfirm({
      orderNo: "TM-2026-00042",
      customerName: "Riaz",
      listingTitle: "Sundarbans 3-Day Tour",
      portalUrl: "https://app.example/account/orders",
    });
    expect(typeof out.subject).toBe("string");
    expect(typeof out.html).toBe("string");
    expect(out.subject.length).toBeGreaterThan(0);
    expect(out.html.length).toBeGreaterThan(0);

    expect(out.subject).toBe("Booking received — TM-2026-00042 (Sundarbans 3-Day Tour)");
    expect(out.html).toContain("TripMate"); // shared base shell footer
    expect(out.html).toContain("Thanks, Riaz");
    expect(out.html).toContain("Sundarbans 3-Day Tour");
    expect(out.html).toContain("TM-2026-00042");
    expect(out.html).toContain('href="https://app.example/account/orders"');
  });

  it("omits the optional sections when name/title/portal are empty", () => {
    const out = renderOrderConfirm({
      orderNo: "TM-2026-00043",
      customerName: "",
      listingTitle: "",
      portalUrl: "",
    });
    expect(out.subject).toBe("Booking received — TM-2026-00043");
    expect(out.html).toContain("Booking received");
    expect(out.html).not.toContain("href=");
    expect(out.html).not.toContain("for ");
  });
});

describe("renderQuoteReady", () => {
  it("returns the { subject, html } shape with the formatted quote and portal link", () => {
    const out = renderQuoteReady({
      orderNo: "TM-2026-00042",
      customerName: "Riaz",
      listingTitle: "Sundarbans 3-Day Tour",
      quotedPrice: 145000,
      currency: "BDT",
      portalUrl: "https://app.example/account/orders",
    });
    expect(out.subject).toBe("Your quote is ready — TM-2026-00042");
    expect(out.html).toContain("TripMate");
    expect(out.html).toContain("Your quote is ready, Riaz");
    // BDT renders through the site's own Indian-grouping taka formatter.
    expect(out.html).toContain("৳1,45,000");
    expect(out.html).toContain('href="https://app.example/account/orders"');
  });

  it("formats non-BDT amounts through the currency's own Intl formatter", () => {
    const out = renderQuoteReady({
      orderNo: "TM-2026-00044",
      customerName: "Riaz",
      listingTitle: "Kathmandu Escape",
      quotedPrice: 850.5,
      currency: "USD",
      portalUrl: "",
    });
    expect(out.html).toContain("$850.50");
    expect(out.html).not.toContain("href=");
  });
});

describe("renderPaymentVerified", () => {
  it("returns the { subject, html } shape with the formatted amount", () => {
    const out = renderPaymentVerified({
      orderNo: "TM-2026-00042",
      customerName: "Riaz",
      amount: 145000,
      currency: "BDT",
    });
    expect(out.subject).toBe("Payment verified — TM-2026-00042");
    expect(out.html).toContain("TripMate");
    expect(out.html).toContain("Payment verified, Riaz");
    expect(out.html).toContain("৳1,45,000");
    expect(out.html).toContain("TM-2026-00042");
  });

  it("falls back to a bare-code grouped amount for an unparseable currency", () => {
    const out = renderPaymentVerified({
      orderNo: "TM-2026-00045",
      customerName: "",
      amount: 12500,
      currency: "X9Y",
    });
    expect(out.html).toContain("X9Y 12,500");
  });
});

describe("renderPaymentRejected", () => {
  it("returns the { subject, html } shape with the gentle retry guidance", () => {
    const out = renderPaymentRejected({
      orderNo: "TM-2026-00042",
      customerName: "Riaz",
      note: "Transaction id not found on our statement",
    });
    expect(out.subject).toBe("Payment could not be verified — TM-2026-00042");
    expect(out.html).toContain("TripMate");
    // The heading goes through base.tsx's JSX (react-dom escapes ' as &#x27;),
    // so assert on the surrounding words rather than the raw apostrophe.
    expect(out.html).toContain("verify your payment, Riaz");
    expect(out.html).toContain("Transaction id not found on our statement");
    expect(out.html).toContain("submit the payment again");
  });

  it("omits the reason row when no note is given", () => {
    const out = renderPaymentRejected({
      orderNo: "TM-2026-00046",
      customerName: "Riaz",
    });
    expect(out.html).not.toContain("Reason");
  });
});

describe("hostile user input (injection / regression guard)", () => {
  it("escapes the hostile value in the html body — entities only, never a raw tag", () => {
    const confirm = renderOrderConfirm({
      orderNo: HOSTILE,
      customerName: HOSTILE,
      listingTitle: HOSTILE,
      portalUrl: "",
    });
    // Exactly one level of escaping: &lt;script&gt; present, no double-escape.
    expect(confirm.html).toContain("&lt;script&gt;");
    expect(confirm.html).not.toContain("&amp;lt;");
    expect(confirm.html).not.toContain(SCRIPT_OPEN);

    const quote = renderQuoteReady({
      orderNo: HOSTILE,
      customerName: HOSTILE,
      listingTitle: HOSTILE,
      quotedPrice: 100,
      currency: HOSTILE,
      portalUrl: "",
    });
    expect(quote.html).toContain("&lt;script&gt;");
    expect(quote.html).not.toContain("&amp;lt;");
    expect(quote.html).not.toContain(SCRIPT_OPEN);

    const verified = renderPaymentVerified({
      orderNo: HOSTILE,
      customerName: HOSTILE,
      amount: 100,
      currency: HOSTILE,
    });
    expect(verified.html).toContain("&lt;script&gt;");
    expect(verified.html).not.toContain("&amp;lt;");
    expect(verified.html).not.toContain(SCRIPT_OPEN);

    const rejected = renderPaymentRejected({
      orderNo: HOSTILE,
      customerName: HOSTILE,
      note: HOSTILE,
    });
    expect(rejected.html).toContain("&lt;script&gt;");
    expect(rejected.html).not.toContain("&amp;lt;");
    expect(rejected.html).not.toContain(SCRIPT_OPEN);
  });

  it("never lets a hostile value leak through as an href attribute break-out", () => {
    const quoteBomb = '"><' + "img src=x onerror=alert(1)>";
    const out = renderOrderConfirm({
      orderNo: "TM-2026-00047",
      customerName: "ok",
      listingTitle: "ok",
      portalUrl: quoteBomb,
    });
    expect(out.html).not.toContain('"><img');
    expect(out.html).toContain("&quot;&gt;&lt;img");
  });

  it("subjects contain no raw angle brackets and no CR/LF (header-safe)", () => {
    const confirm = renderOrderConfirm({
      orderNo: "TM-2026-00048",
      customerName: HOSTILE,
      listingTitle: "Tour\r\nBcc: evil@example.com",
      portalUrl: "",
    });
    expect(confirm.subject).not.toMatch(/[<>]/);
    // Header injection guard: no CR/LF survives into a subject — the value stays
    // one single-line header, so the stray "Bcc:" text is inert.
    expect(confirm.subject).not.toMatch(/[\r\n]/);

    const quote = renderQuoteReady({
      orderNo: "TM-2026-00049",
      customerName: HOSTILE,
      listingTitle: HOSTILE,
      quotedPrice: 100,
      currency: "BDT",
      portalUrl: "",
    });
    expect(quote.subject).not.toMatch(/[<>]/);

    const verified = renderPaymentVerified({
      orderNo: "TM-2026-00050",
      customerName: HOSTILE,
      amount: 100,
      currency: "BDT",
    });
    expect(verified.subject).not.toMatch(/[<>]/);

    const rejected = renderPaymentRejected({
      orderNo: "TM-2026-00051",
      customerName: HOSTILE,
      note: "ok\r\nBcc: evil@example.com",
    });
    expect(rejected.subject).not.toMatch(/[<>]/);
    expect(rejected.subject).not.toMatch(/[\r\n]/);
  });
});
