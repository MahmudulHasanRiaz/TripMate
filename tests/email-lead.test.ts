import { describe, it, expect } from "vitest";
import { renderLeadReceived, renderLeadAssigned } from "@/modules/email/templates/lead";

// The lead templates render through react-dom/server only (via base.tsx) — no
// DB, no "server-only" marker — so they import cleanly under vitest's node env.

// A hostile first-contact value: an HTML tag open + the letters s c r i p t + a
// closing angle + alert text. It is assembled from concatenated literals so a
// contiguous script tag never appears verbatim in this test source.
const SCRIPT_OPEN = "<" + "scr" + "ipt>";
const SCRIPT_CLOSE = "</" + "scr" + "ipt>";
const HOSTILE = SCRIPT_OPEN + "alert('pwned')" + SCRIPT_CLOSE;

describe("renderLeadReceived", () => {
  it("returns the { subject, html } shape with the branded shell", () => {
    const out = renderLeadReceived({
      name: "Riaz",
      landingTitle: "Sundarbans Tour",
      sitePhone: "+880 1712 345678",
    });
    expect(typeof out.subject).toBe("string");
    expect(typeof out.html).toBe("string");
    expect(out.subject.length).toBeGreaterThan(0);
    expect(out.html.length).toBeGreaterThan(0);

    expect(out.subject).toBe("Your Sundarbans Tour enquiry — we'll be in touch");
    expect(out.html).toContain("TripMate"); // shared base shell footer
    expect(out.html).toContain("Thanks, Riaz");
    expect(out.html).toContain("Sundarbans Tour");
    expect(out.html).toContain('href="tel:+880 1712 345678"');
  });

  it("omits the optional name / title / phone sections when empty", () => {
    const out = renderLeadReceived({ name: "", landingTitle: "", sitePhone: "" });
    expect(out.subject).toBe("Your enquiry — we'll be in touch");
    expect(out.html).not.toContain("tel:");
    expect(out.html).not.toContain("enquiry about");
  });
});

describe("renderLeadAssigned", () => {
  it("returns the { subject, html } shape with the branded shell", () => {
    const out = renderLeadAssigned({
      leadName: "Riaz",
      landingTitle: "Sundarbans Tour",
      adminUrl: "https://app.example/admin/leads/evt-1",
      assignedToName: "Tania",
    });
    expect(out.subject).toBe("New Sundarbans Tour lead assigned to Tania");
    expect(out.html).toContain("New lead assigned to Tania");
    expect(out.html).toContain("TripMate");
    expect(out.html).toContain("admin/leads/evt-1");
  });
});

describe("hostile user input (injection / regression guard)", () => {
  it("escapes the hostile value in the html body — entities only, never a raw tag", () => {
    const received = renderLeadReceived({
      name: HOSTILE,
      landingTitle: HOSTILE,
      sitePhone: HOSTILE,
    });
    // Exactly one level of escaping: &lt;script&gt; present, no double-escape.
    expect(received.html).toContain("&lt;script&gt;");
    expect(received.html).not.toContain("&amp;lt;");
    // The contiguous raw tag is never present in the rendered email.
    expect(received.html).not.toContain(SCRIPT_OPEN);

    const assigned = renderLeadAssigned({
      leadName: HOSTILE,
      landingTitle: HOSTILE,
      adminUrl: HOSTILE,
      assignedToName: HOSTILE,
    });
    expect(assigned.html).toContain("&lt;script&gt;");
    expect(assigned.html).not.toContain("&amp;lt;");
    expect(assigned.html).not.toContain(SCRIPT_OPEN);
  });

  it("never lets a hostile value leak through as an href attribute break-out", () => {
    const quoteBomb = '"><' + "img src=x onerror=alert(1)>";
    const out = renderLeadReceived({
      name: "ok",
      landingTitle: "ok",
      sitePhone: quoteBomb,
    });
    expect(out.html).not.toContain('"><img');
    expect(out.html).toContain("&quot;&gt;&lt;img");
  });

  it("subjects contain no raw angle brackets and no CR/LF (header-safe)", () => {
    const received = renderLeadReceived({
      name: HOSTILE,
      landingTitle: HOSTILE,
      sitePhone: HOSTILE,
    });
    expect(received.subject).not.toMatch(/[<>]/);

    const assigned = renderLeadAssigned({
      leadName: HOSTILE,
      landingTitle: "Tour\r\nBcc: evil@example.com",
      adminUrl: HOSTILE,
      assignedToName: HOSTILE,
    });
    expect(assigned.subject).not.toMatch(/[<>]/);
    // Header injection guard: no CR/LF survives into a subject — the value stays
    // one single-line header, so the stray "Bcc:" text is inert.
    expect(assigned.subject).not.toMatch(/[\r\n]/);
  });
});
