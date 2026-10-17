import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Behavioural tests for scripts/auto-migrate.mjs itself. These spawn the REAL
// script (no DB needed): the fail-fast and skip paths exit before any
// connection is attempted, which is exactly what we assert.
//
// Follow-up 02 (corrected by 03): a transaction-pooler-only config must fail
// the deploy build with an actionable message instead of a cryptic mid-build
// DDL error, and SKIP_DB_MIGRATE must shout before it skips.

const ROOT = path.resolve(import.meta.dirname, "..");
const TRANSACTION_POOLER_URL =
  "postgresql://postgres:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

const run = (env: Record<string, string>) =>
  spawnSync(process.execPath, ["scripts/auto-migrate.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      // Never let an ambient .env override the fixture under test.
      DATABASE_URL: "",
      DATABASE_URL_MIGRATE: "",
      SKIP_DB_MIGRATE: "",
      ...env,
    },
    encoding: "utf8",
    timeout: 30_000,
  });

describe("auto-migrate script — fail fast on transaction-pooler config", () => {
  it("exits 1 with an actionable message when only a transaction-pooler DATABASE_URL is set", () => {
    const res = run({ DATABASE_URL: TRANSACTION_POOLER_URL });
    expect(res.status).toBe(1);
    const out = `${res.stdout}\n${res.stderr}`;
    expect(out).toContain("DATABASE_URL_MIGRATE");
    expect(out).toContain("db.<ref>.supabase.co");
    expect(out).toContain("5432");
    expect(out).toContain("6543");
    expect(out.toLowerCase()).not.toContain("pooler hostname");
  }, 30_000);

  it("exits 1 when DATABASE_URL_MIGRATE is a transaction pooler (6543)", () => {
    const res = run({
      DATABASE_URL: "postgresql://u:p@db.abcdefghijklmnop.supabase.co:5432/postgres",
      DATABASE_URL_MIGRATE:
        "postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    });
    expect(res.status).toBe(1);
    const out = `${res.stdout}\n${res.stderr}`;
    expect(out).toContain("DATABASE_URL_MIGRATE");
    expect(out).toContain("6543");
    expect(out.toLowerCase()).toContain("session pooler");
    expect(out.toLowerCase()).not.toContain("pooler hostname");
  }, 30_000);

  it("exits 1 when neither URL variable is set", () => {
    const res = run({});
    expect(res.status).toBe(1);
    const out = `${res.stdout}\n${res.stderr}`;
    expect(out).toContain("DATABASE_URL_MIGRATE");
    expect(out).toContain("DATABASE_URL");
  }, 30_000);
});

describe("auto-migrate script — SKIP_DB_MIGRATE escape hatch", () => {
  it("exits 0 with a loud drift warning and never touches the DB", () => {
    const res = run({ SKIP_DB_MIGRATE: "1" });
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/!{5,}/);
    expect(res.stdout).toContain("SKIP_DB_MIGRATE");
    expect(res.stdout.toLowerCase()).toContain("drift");
  }, 30_000);
});
