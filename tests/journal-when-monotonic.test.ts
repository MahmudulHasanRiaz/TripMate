import { describe, expect, it } from "vitest";
import journal from "../drizzle/meta/_journal.json";

// Follow-up 04 regression guard: drizzle's pg migrator fetches the single
// max(created_at) row ONCE and applies a journal entry only when its `when`
// (folderMillis) is STRICTLY GREATER than that value
// (node_modules/drizzle-orm/pg-core/dialect.js → migrate()). A hand-faked,
// non-monotonic `when` therefore causes migrations to be SILENTLY SKIPPED on
// any database that has already applied a later-timestamped entry.
//
// Rule: never hand-write `when`; generate with drizzle-kit (real Date.now()) or
// stamp current epoch millis and keep the sequence strictly increasing.
describe("drizzle journal `when` timestamps", () => {
  it("are strictly increasing across ALL entries", () => {
    const { entries } = journal;
    expect(entries.length).toBeGreaterThan(1);

    for (let i = 1; i < entries.length; i += 1) {
      const prev = entries[i - 1];
      const curr = entries[i];
      expect(
        curr.when,
        `entry ${curr.tag} when (${curr.when}) must be > entry ${prev.tag} when (${prev.when}) — ` +
          "a non-monotonic when makes the migrator silently skip this migration",
      ).toBeGreaterThan(prev.when);
    }
  });

  it("uses real epoch-millis integers (not hand-faked sequences)", () => {
    for (const entry of journal.entries) {
      expect(Number.isInteger(entry.when), `${entry.tag} when must be an integer`).toBe(true);
      // Anything before 2026-01-01 is certainly fabricated — every migration in
      // this project was authored in 2026.
      expect(entry.when, `${entry.tag} when looks fabricated`).toBeGreaterThan(1767225600000);
    }
  });
});
