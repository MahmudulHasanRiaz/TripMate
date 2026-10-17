import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import "dotenv/config";
import journal from "../drizzle/meta/_journal.json";

// Integration for scripts/auto-migrate.mjs against an EPHEMERAL Postgres
// database (created + dropped inside the local server from DATABASE_URL).
// First run applies the full 0000..N chain; second run is a clean no-op; the
// applied-row count always matches drizzle/meta/_journal.json.
//
// Gated behind RUN_DB_INTEGRATION=1 like the other DB suites.
const integration = process.env.RUN_DB_INTEGRATION === "1";
const ROOT = path.resolve(import.meta.dirname, "..");
const SCRATCH_DB = "tripmate_automigrate_e2e";

const baseUrl = process.env.DATABASE_URL ?? "";
const scratchUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH_DB}$1`);

const run = (env: Record<string, string>) =>
  spawnSync(process.execPath, ["scripts/auto-migrate.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: "",
      DATABASE_URL_MIGRATE: "",
      SKIP_DB_MIGRATE: "",
      ...env,
    },
    encoding: "utf8",
    timeout: 120_000,
  });

describe.skipIf(!integration)("auto-migrate script (integration — scratch Postgres)", () => {
  beforeAll(async () => {
    const postgres = (await import("postgres")).default;
    const admin = postgres(baseUrl, { max: 1 });
    try {
      await admin.unsafe(`drop database if exists "${SCRATCH_DB}" with (force)`);
      await admin.unsafe(`create database "${SCRATCH_DB}"`);
    } finally {
      await admin.end();
    }
  }, 120_000);

  afterAll(async () => {
    const postgres = (await import("postgres")).default;
    const admin = postgres(baseUrl, { max: 1 });
    try {
      await admin.unsafe(`drop database if exists "${SCRATCH_DB}" with (force)`);
    } finally {
      await admin.end();
    }
  }, 120_000);

  it("applies the full journal on first run and logs every migration name", async () => {
    const res = run({ DATABASE_URL_MIGRATE: scratchUrl });
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain("FATAL");
    for (const entry of journal.entries) {
      expect(res.stdout).toContain(entry.tag);
    }
    expect(res.stdout).toContain(`verified: ${journal.entries.length}/${journal.entries.length}`);

    const postgres = (await import("postgres")).default;
    const client = postgres(scratchUrl, { max: 1 });
    try {
      const rows = await client.unsafe(
        'select count(*)::int as count from drizzle."__drizzle_migrations"',
      );
      expect(rows[0].count).toBe(journal.entries.length);
    } finally {
      await client.end();
    }
  }, 120_000);

  it("is a clean no-op on the second run", () => {
    const res = run({ DATABASE_URL_MIGRATE: scratchUrl });
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain("FATAL");
    expect(res.stdout).toMatch(/up to date/i);
  }, 120_000);
});

// Follow-up 04: the production scenario the old empty-DB test could not catch.
// A database that already has the first 8 journal entries applied (max
// created_at = entry 7's real `when`) must still receive 0008..0013 on the next
// deploy. Drizzle's migrator fetches ONE max(created_at) row and applies an
// entry only when its `when` is GREATER — a non-monotonic journal makes these
// silently skip. This test would have failed before the `when` fix.
const PARTIAL_DB = "tripmate_automigrate_partial_e2e";
const partialUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, `/${PARTIAL_DB}$1`);
const PARTIAL_PREFIX = 8; // entries 0..7 = the already-applied staging state

// Temp migrations folder holding ONLY entries 0..7 (same whens/tags) so the
// REAL drizzle migrator can bring the scratch DB to the exact staging state:
// schema applied via the real SQL files + 8 bookkeeping rows with real
// whens/hashes. Faking the bookkeeping table alone is not enough — migration
// 0008+ ALTERs real tables that only exist once 0000..0007 ran.
let prefixFolder = "";

describe.skipIf(!integration)("auto-migrate script (integration — partially migrated database)", () => {
  beforeAll(async () => {
    const postgres = (await import("postgres")).default;
    const admin = postgres(baseUrl, { max: 1 });
    try {
      await admin.unsafe(`drop database if exists "${PARTIAL_DB}" with (force)`);
      await admin.unsafe(`create database "${PARTIAL_DB}"`);
    } finally {
      await admin.end();
    }

    prefixFolder = mkdtempSync(path.join(tmpdir(), "tripmate-partial-"));
    mkdirSync(path.join(prefixFolder, "meta"));
    const prefixEntries = journal.entries.slice(0, PARTIAL_PREFIX);
    for (const entry of prefixEntries) {
      copyFileSync(
        path.join(ROOT, "drizzle", `${entry.tag}.sql`),
        path.join(prefixFolder, `${entry.tag}.sql`),
      );
    }
    writeFileSync(
      path.join(prefixFolder, "meta", "_journal.json"),
      JSON.stringify({ version: "7", dialect: "postgresql", entries: prefixEntries }),
    );

    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(partialUrl, { max: 1 });
    try {
      await migrate(drizzle(client), { migrationsFolder: prefixFolder });
    } finally {
      await client.end();
    }
  }, 120_000);

  afterAll(async () => {
    if (prefixFolder) rmSync(prefixFolder, { recursive: true, force: true });
    const postgres = (await import("postgres")).default;
    const admin = postgres(baseUrl, { max: 1 });
    try {
      await admin.unsafe(`drop database if exists "${PARTIAL_DB}" with (force)`);
    } finally {
      await admin.end();
    }
  }, 120_000);

  it("applies the remaining entries on top of the pre-applied prefix", async () => {
    const res = run({ DATABASE_URL_MIGRATE: partialUrl });
    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain("FATAL");
    for (const entry of journal.entries.slice(PARTIAL_PREFIX)) {
      expect(res.stdout).toContain(`applied: ${entry.tag}`);
    }
    expect(res.stdout).toContain(`verified: ${journal.entries.length}/${journal.entries.length}`);

    const postgres = (await import("postgres")).default;
    const client = postgres(partialUrl, { max: 1 });
    try {
      const rows = await client.unsafe(
        'select count(*)::int as count from drizzle."__drizzle_migrations"',
      );
      expect(rows[0].count).toBe(journal.entries.length);
    } finally {
      await client.end();
    }
  }, 120_000);
});
