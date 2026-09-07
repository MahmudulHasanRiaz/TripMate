import "dotenv/config";
import postgres from "postgres";

/**
 * One-off, idempotent seo-title cleanup (Plan 6 T3e).
 *
 * The Firebase-era CMS saved seo->title values that already carried the
 * rendered "| TripMate" suffix (e.g. "Umrah Premium | TripMate"). Next's
 * metadata template appends the suffix at render time, so stored titles with
 * the suffix render as "Umrah Premium | TripMate | TripMate" — this script
 * strips the trailing suffix from the seo jsonb of listings/posts/pages so the
 * stored value is the RAW title and the render pipeline owns the branding.
 *
 * Idempotent: the WHERE clause only matches rows whose seo title still ends in
 * one or more " | TripMate" occurrences (whitespace-flexible, exact case), and
 * the update strips ALL trailing occurrences in one pass. Re-running after a
 * clean pass matches zero rows. A title that was ONLY the suffix (e.g.
 * "| TripMate") has the seo.title key removed entirely so the page falls back
 * to the row's own title; every other seo key (description, ogImage, ...) is
 * preserved by jsonb_set.
 *
 * Cache note: this writes straight to the DB, so prerendered/cached pages keep
 * the old <title> until their cache entries expire (hours-profile cacheLife)
 * or the next deploy rebuilds them — acceptable for a one-off cleanup, and the
 * values written are the final state either way.
 */

const TABLES = ["listings", "posts", "pages"] as const;

// Strips one-or-more trailing " | TripMate" occurrences (whitespace-flexible).
// In the JS template literal every backslash is doubled so the SQL regex
// receives \s and \| (a single backslash would be eaten by JS string escapes).
const STRIP_PATTERN = "(\\s*\\|\\s*TripMate)+\\s*$";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    for (const table of TABLES) {
      const result = await sql`
        update ${sql(table)}
        set seo = case
          when regexp_replace(seo->>'title', ${STRIP_PATTERN}, '') = ''
            then seo - 'title'
          else jsonb_set(
            seo,
            '{title}',
            to_jsonb(regexp_replace(seo->>'title', ${STRIP_PATTERN}, ''))
          )
        end
        where seo->>'title' ~ '\\s*\\|\\s*TripMate\\s*$'
      `;
      console.log(`${table}: ${result.count} row(s) cleaned`);
    }
  } finally {
    await sql.end();
  }
}

main();
