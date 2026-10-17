import { spawnSync } from "node:child_process";
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
