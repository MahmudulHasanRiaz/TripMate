import { describe, expect, it } from "vitest";
import {
  isPooledUrl,
  journalReadiness,
  pooledUrlReason,
  resolveMigrationDatabaseUrl,
} from "../scripts/migrate-lib.mjs";

// Unit coverage for the deploy-time auto-migration guard rails (Follow-up 02).
// Pure functions only — no database, no spawning.

const DIRECT_SUPABASE =
  "postgresql://postgres:pw@db.abcdefghijklmnop.supabase.co:5432/postgres";
const POOLED_SUPABASE =
  "postgresql://postgres:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const SESSION_POOLER =
  "postgresql://postgres:pw@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

describe("pooledUrlReason", () => {
  it("accepts a Supabase direct connection (db.<ref>.supabase.co:5432)", () => {
    expect(pooledUrlReason(DIRECT_SUPABASE)).toBeNull();
  });

  it("flags the transaction pooler (port 6543)", () => {
    const reason = pooledUrlReason(POOLED_SUPABASE);
    expect(reason).toBeTruthy();
    expect(reason).toContain("6543");
  });

  it("flags a pooler hostname even on port 5432 (session pooler)", () => {
    const reason = pooledUrlReason(SESSION_POOLER);
    expect(reason).toBeTruthy();
    expect(reason?.toLowerCase()).toContain("pooler");
  });

  it("flags port 6543 on any host", () => {
    expect(pooledUrlReason("postgresql://postgres:pw@localhost:6543/tripmate")).toBeTruthy();
  });

  it("flags ?pgbouncer=true even on an otherwise direct URL", () => {
    expect(
      pooledUrlReason("postgresql://postgres:pw@localhost:5432/tripmate?pgbouncer=true"),
    ).toBeTruthy();
  });

  it("accepts a plain local/dev connection", () => {
    expect(pooledUrlReason("postgresql://postgres:postgres@localhost:5432/tripmate")).toBeNull();
  });

  it("accepts a Neon/plain hosted URL with no port (defaults to 5432)", () => {
    expect(
      pooledUrlReason("postgresql://u:p@ep-cool-123.us-east-2.aws.neon.tech/neondb"),
    ).toBeNull();
  });

  it("handles the postgres:// scheme as well as postgresql://", () => {
    expect(pooledUrlReason("postgres://u:p@localhost:6543/db")).toBeTruthy();
    expect(pooledUrlReason("postgres://u:p@localhost:5432/db")).toBeNull();
  });

  it("exposes isPooledUrl as the boolean form", () => {
    expect(isPooledUrl(POOLED_SUPABASE)).toBe(true);
    expect(isPooledUrl(DIRECT_SUPABASE)).toBe(false);
  });
});

describe("resolveMigrationDatabaseUrl", () => {
  it("prefers DATABASE_URL_MIGRATE when set and direct", () => {
    expect(
      resolveMigrationDatabaseUrl({
        DATABASE_URL: POOLED_SUPABASE,
        DATABASE_URL_MIGRATE: DIRECT_SUPABASE,
      }),
    ).toEqual({ url: DIRECT_SUPABASE, source: "DATABASE_URL_MIGRATE" });
  });

  it("falls back to a non-pooled DATABASE_URL when DATABASE_URL_MIGRATE is unset", () => {
    expect(resolveMigrationDatabaseUrl({ DATABASE_URL: DIRECT_SUPABASE })).toEqual({
      url: DIRECT_SUPABASE,
      source: "DATABASE_URL",
    });
  });

  it("treats whitespace-only values as unset", () => {
    expect(
      resolveMigrationDatabaseUrl({ DATABASE_URL: DIRECT_SUPABASE, DATABASE_URL_MIGRATE: "  " }),
    ).toEqual({ url: DIRECT_SUPABASE, source: "DATABASE_URL" });
  });

  it("fails fast when DATABASE_URL_MIGRATE itself is pooled", () => {
    const result = resolveMigrationDatabaseUrl({
      DATABASE_URL: DIRECT_SUPABASE,
      DATABASE_URL_MIGRATE: POOLED_SUPABASE,
    });
    expect("error" in result).toBe(true);
    const msg = "error" in result ? result.error : "";
    expect(msg).toContain("DATABASE_URL_MIGRATE");
    expect(msg.toLowerCase()).toContain("pooled");
    expect(msg).toContain("5432");
    expect(msg).toContain("db.<ref>.supabase.co");
  });

  it("fails fast with an actionable message when only a pooled DATABASE_URL exists", () => {
    const result = resolveMigrationDatabaseUrl({ DATABASE_URL: POOLED_SUPABASE });
    expect("error" in result).toBe(true);
    const msg = "error" in result ? result.error : "";
    expect(msg).toContain("DATABASE_URL_MIGRATE");
    expect(msg).toContain("db.<ref>.supabase.co");
    expect(msg).toContain("5432");
    expect(msg.toLowerCase()).toContain("pooled");
  });

  it("fails when neither variable is set", () => {
    const result = resolveMigrationDatabaseUrl({});
    expect("error" in result).toBe(true);
    const msg = "error" in result ? result.error : "";
    expect(msg).toContain("DATABASE_URL_MIGRATE");
    expect(msg).toContain("DATABASE_URL");
  });
});

describe("journalReadiness", () => {
  const journal = [
    { idx: 0, when: 1000, tag: "0000_init" },
    { idx: 1, when: 2000, tag: "0001_add_users" },
    { idx: 2, when: 3000, tag: "0002_add_orders" },
  ];

  it("verifies a fully applied database", () => {
    const report = journalReadiness(journal, [1000, 2000, 3000]);
    expect(report.verified).toBe(true);
    expect(report.journalCount).toBe(3);
    expect(report.appliedCount).toBe(3);
    expect(report.missingTags).toEqual([]);
    expect(report.extraCount).toBe(0);
  });

  it("names the missing migrations when the database is behind", () => {
    const report = journalReadiness(journal, [1000, 2000]);
    expect(report.verified).toBe(false);
    expect(report.missingTags).toEqual(["0002_add_orders"]);
    expect(report.appliedCount).toBe(2);
    expect(report.journalCount).toBe(3);
  });

  it("reports extra applied rows when the journal is behind the database", () => {
    const report = journalReadiness(journal, [1000, 2000, 3000, 4000]);
    expect(report.verified).toBe(false);
    expect(report.extraCount).toBe(1);
    expect(report.missingTags).toEqual([]);
  });

  it("returns applied tags in journal order", () => {
    const report = journalReadiness(journal, [3000, 1000, 2000]);
    expect(report.appliedTags).toEqual(["0000_init", "0001_add_users", "0002_add_orders"]);
  });
});
