import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// env-file.ts is server-only (throws outside a React Server runtime); stub the
// marker so the module imports cleanly under vitest's node env.
vi.mock("server-only", () => ({}));

import { parseEnvFile, serializeEnvFile } from "@/lib/env-file";

describe("env-file parse/serialize (pure)", () => {
  it("parses KEY=VALUE lines, ignores comments and blanks", () => {
    const parsed = parseEnvFile("# comment\n\nA=1\nB=hello world\n");
    expect(parsed).toEqual({ A: "1", B: "hello world" });
  });

  it("replaces existing keys, preserves untouched lines and comments", () => {
    const out = serializeEnvFile("# header\nA=1\nB=2\n", { A: "9", C: "3" });
    expect(out).toContain("# header");
    expect(out).toContain("A=9");
    expect(out).not.toContain("A=1");
    expect(out).toContain("B=2");
    expect(out).toMatch(/C=3(\r?\n)?$/);
  });

  it("quotes values containing spaces or #", () => {
    const out = serializeEnvFile("", { FROM: "Trip Mate #1 <no-reply@x.com>" });
    expect(out).toContain('FROM="Trip Mate #1 <no-reply@x.com>"');
  });
});

import { writeEnvValues, ENV_WRITABLE_KEYS } from "@/lib/env-file";

describe("writeEnvValues (tmp dir)", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "envtest-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it("writes new keys and updates existing ones atomically", () => {
    writeFileSync(join(dir, ".env"), "OLD=keep\nR2_BUCKET_NAME=x\n");
    writeEnvValues({ R2_BUCKET_NAME: "y", SMTP_HOST: "smtp.x.com" }, join(dir, ".env"));
    const content = readFileSync(join(dir, ".env"), "utf8");
    expect(content).toContain("OLD=keep");
    expect(content).toContain("R2_BUCKET_NAME=y");
    expect(content).toContain("SMTP_HOST=smtp.x.com");
  });

  it("rejects keys outside the whitelist", () => {
    expect(() => writeEnvValues({ EVIL: "1" }, join(dir, ".env"))).toThrowError(/not writable/);
    expect(ENV_WRITABLE_KEYS).not.toContain("DATABASE_URL");
    expect(ENV_WRITABLE_KEYS).not.toContain("AUTH_SECRET");
  });

  it("rejects a write to boot-frozen AUTH_SECRET", () => {
    // AUTH_SECRET is read once by better-auth at boot; a mid-run rewrite would
    // only apply after a restart and would invalidate every live session in
    // between — it must never be writable through the app.
    expect(() => writeEnvValues({ AUTH_SECRET: "x".repeat(32) }, join(dir, ".env"))).toThrowError(/not writable/);
  });
});
