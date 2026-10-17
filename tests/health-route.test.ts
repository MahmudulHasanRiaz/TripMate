import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import journal from "../drizzle/meta/_journal.json";

// Unit tests for GET /api/health (Follow-up 02 §2): the deploy-visibility
// probe must expose migrationsApplied / migrationsPending so the owner can
// prove a deploy migrated the DB with a single curl. The db client is mocked —
// this suite never touches Postgres.
vi.mock("@/db/client", () => ({ db: { execute: vi.fn() } }));

import { db } from "@/db/client";
import { GET } from "@/app/api/health/route";

const execute = db.execute as unknown as Mock;
const journalCount = journal.entries.length;

describe("GET /api/health", () => {
  beforeEach(() => {
    execute.mockReset();
  });

  it("reports migrations up to date when applied rows match the journal", async () => {
    execute.mockResolvedValueOnce([]); // select 1
    execute.mockResolvedValueOnce([{ count: journalCount }]); // count(*)

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      db: true,
      migrationsApplied: journalCount,
      migrationsPending: 0,
    });
  });

  it("reports pending migrations when the database is behind the journal", async () => {
    execute.mockResolvedValueOnce([]);
    execute.mockResolvedValueOnce([{ count: journalCount - 3 }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.migrationsApplied).toBe(journalCount - 3);
    expect(body.migrationsPending).toBe(3);
  });

  it("treats a missing migrations table as zero applied", async () => {
    execute.mockResolvedValueOnce([]);
    execute.mockRejectedValueOnce(new Error('relation "drizzle.__drizzle_migrations" does not exist'));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.migrationsApplied).toBe(0);
    expect(body.migrationsPending).toBe(journalCount);
  });

  it("returns 503 when the database is unreachable", async () => {
    execute.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});
