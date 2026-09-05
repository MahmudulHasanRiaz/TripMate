import { describe, it, expect, vi } from "vitest";

// send.ts / transport.ts are server-only (throw outside a React Server
// runtime); stub the marker so the modules import cleanly under vitest's node
// env — same pattern as Tasks 3-6 tests.
vi.mock("server-only", () => ({}));

import { sendEmail } from "@/modules/email/send";

describe("sendEmail", () => {
  it("no-ops gracefully when SMTP is unconfigured", async () => {
    delete process.env.SMTP_HOST;
    const result = await sendEmail({
      to: "x@y.com",
      subject: "T",
      html: "<p>T</p>",
    });
    expect(result.sent).toBe(false);
  });
});
