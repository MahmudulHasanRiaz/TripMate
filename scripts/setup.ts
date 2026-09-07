import "dotenv/config";
import { execSync } from "node:child_process";
import postgres from "postgres";

/** One-command onboarding: env check → DB reachability → migrate → seed. */
function run(label: string, cmd: string): boolean {
  try {
    execSync(cmd, { stdio: "inherit", shell: true, env: process.env });
    return true;
  } catch {
    console.error(`\n[setup] FAILED at: ${label}`);
    return false;
  }
}

async function main() {
  console.log("=== TripMate setup ===\n");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "[setup] DATABASE_URL is not set. Copy .env.example to .env and fill it in first:\n" +
        "  cp .env.example .env\n" +
        "Local Postgres: docker compose up -d (or point DATABASE_URL at your own).",
    );
    process.exit(1);
  }
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    console.error(
      "[setup] AUTH_SECRET is missing or shorter than 32 chars. Generate one:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
    process.exit(1);
  }

  console.log("[setup] Checking database connectivity...");
  try {
    const sql = postgres(url, { max: 1, connect_timeout: 5 });
    const v = await sql`select version()`;
    console.log(`  OK — ${v[0].version.split(",")[0]}`);
    await sql.end();
  } catch (e) {
    console.error(
      `  Cannot reach the database (${e instanceof Error ? e.message : e}).\n` +
        "  Start the local one with: docker compose up -d\n" +
        "  or fix DATABASE_URL in .env.",
    );
    process.exit(1);
  }

  if (!run("migrations (npm run db:migrate)", "npm run db:migrate")) process.exit(1);
  if (!run("seed (npm run db:seed)", "npm run db:seed")) process.exit(1);

  console.log(
    "\n=== Setup complete ===\n" +
      "Start the app:   npm run dev  →  http://localhost:3000\n" +
      "First run ever?  open http://localhost:3000/setup to create the superadmin\n" +
      "Gates:           npm run lint && npm run typecheck && npm test && npm run test:e2e",
  );
}

main();
