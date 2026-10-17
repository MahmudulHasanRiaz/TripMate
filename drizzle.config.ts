import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// MIGRATION JOURNAL RULE (Follow-up 04): never hand-write or hand-fake a
// journal entry's `when`. drizzle's migrator fetches ONE max(created_at) row
// and applies an entry only when its `when` is strictly GREATER — a
// non-monotonic `when` makes every following migration SILENTLY SKIP on any
// database that already applied a later-timestamped entry. Always generate
// with `npm run db:generate` (stamps real Date.now()); if hand-authoring,
// stamp current epoch millis and keep entries strictly increasing — enforced
// by tests/journal-when-monotonic.test.ts.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
