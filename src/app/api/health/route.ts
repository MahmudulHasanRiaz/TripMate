import { sql } from "drizzle-orm";
import journal from "../../../../drizzle/meta/_journal.json";
import { db } from "@/db/client";

/**
 * Unauthenticated health probe (Docker HEALTHCHECK / Portainer / uptime
 * monitors — see the Plan 7 Dockerfile). A plain SELECT 1 proves the app can
 * reach PostgreSQL and serve a query; anything else (pool exhausted, DB down,
 * network partition) is a 503 so orchestrators can act on it.
 *
 * It also exposes migration visibility (Follow-up 02 §2): the committed
 * journal is bundled at build time, and applied rows are counted from
 * drizzle."__drizzle_migrations". After any deploy `migrationsPending: 0` is
 * the one-command proof that auto-migration ran.
 *
 * GET route handlers are dynamic by default in Next 15+, so this is never
 * prerendered at build time — no DB access during `next build`.
 */
const JOURNAL_MIGRATION_COUNT = journal.entries.length;

export async function GET() {
  try {
    await db.execute(sql`select 1`);

    let migrationsApplied = 0;
    try {
      const rows = (await db.execute(
        sql`select count(*)::int as count from drizzle."__drizzle_migrations"`,
      )) as Array<{ count: number }>;
      migrationsApplied = Number(rows[0]?.count ?? 0);
    } catch {
      // Table absent before the first migration ever ran — zero applied.
      migrationsApplied = 0;
    }

    return Response.json(
      {
        ok: true,
        db: true,
        migrationsApplied,
        migrationsPending: Math.max(0, JOURNAL_MIGRATION_COUNT - migrationsApplied),
      },
      { status: 200 },
    );
  } catch {
    return Response.json({ ok: false, db: false }, { status: 503 });
  }
}
