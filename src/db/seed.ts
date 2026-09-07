import "dotenv/config";
import { seedDemoData } from "./demo-seeder";
import { seedProductionBaseline } from "./production-seeder";

/**
 * TripMate Database Seeder.
 *
 * Supports two distinct operational modes:
 *  - `--production` / `--prod`: Clean agency baseline (settings, categories, static legal pages).
 *    Strictly NO demo packages, dummy destinations, or sample media.
 *  - `--demo` (default): Rich commercial demonstration with luxury packages,
 *    destinations, visa types, passport services, expenses, guides, and stored assets.
 */
async function main() {
  const isProduction =
    process.argv.includes("--production") || process.argv.includes("--prod");

  if (isProduction) {
    console.log("[seed] Mode: PRODUCTION (Clean start without demo catalog or sample media)");
    await seedProductionBaseline();
  } else {
    console.log("[seed] Mode: DEMO / SHOWCASE (Full commercial operating system with stored assets)");
    await seedDemoData();
  }
}

main()
  .then(() => {
    console.log("[seed] Seeding process completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] Seeding failed with error:", err);
    process.exit(1);
  });

