import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  // Serial: every spec file reads/writes the SAME dev DB, and 00-setup.spec.ts
  // must fully finish (create admin@tripmate.test, lock /setup) before the
  // auth/admin specs sign in. Under the default 50%-of-cores workers (6 on a
  // 12-core box) Playwright starts ALL spec files in parallel, so the "00-"
  // prefix alone cannot guarantee ordering on a fresh DB — and the 6-way
  // simultaneous Turbopack cold-compile of /login + /api/auth intermittently
  // hung sign-in POSTs past the 20s wait. workers: 1 serializes the files in
  // sorted order (00-setup -> admin -> auth -> smoke) and compiles one route
  // set at a time. ~10 tests, ~25s warm: the lost parallelism is negligible.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
