import { test, expect } from "@playwright/test";

// =============================================================================
// 00-setup — the setup-wizard e2e. The "00-" prefix makes this file sort BEFORE
// admin/auth/smoke. playwright.config.ts forces workers: 1, so spec FILES run
// strictly in sorted order and a FRESH database is configured here — superadmin
// admin@tripmate.test created, /setup locked — before the auth/admin specs sign
// in as that user. (A rename alone would NOT guarantee that: the default
// 50%-of-cores workers runs all files in parallel. workers: 1 is what actually
// serializes them.)
//
// Idempotency: this spec MUTATES the dev DB on purpose, so once it has run the
// DB cannot run it again — /setup redirects away when setup is complete. Rather
// than fail on a re-run, the whole describe below skips so a full-suite run
// against an already-set-up DB stays green. Lock state is detected by the probe
// test; every other test is gated on the shared flag.
//
// Why this skip pattern (Playwright 1.63, verified against installed types):
//   * test.skip(condition, desc) / test.info().skip() INSIDE a test body abort
//     only THAT test — the decision does NOT propagate to later tests.
//   * test.skip(callback, desc) CAN mark a whole file/describe skipped, but the
//     callback is synchronous (ConditionBody = (args) => boolean) — it cannot
//     await a page.goto, so it cannot discover lock state at runtime.
//   * => the working pattern for "detect once, skip the rest" is a SHARED
//     MODULE FLAG (setupLocked below): the probe test sets it; each later test
//     body opens with `test.skip(setupLocked, "...")`. A skipped test inside a
//     describe.serial does NOT fail-fast the group, so without the guard the
//     wizard test would still run and fail on a locked DB.
// =============================================================================
let setupLocked = false; // module state: true once a probe finds /setup closed

test.describe.serial("setup wizard", () => {
  // Probe — runs first in the group. Detects whether /setup still serves the
  // wizard (fresh DB) or redirects away (a prior run already configured it).
  test("probes whether /setup is still open", async ({ page }) => {
    await page.goto("/setup");
    setupLocked = !page.url().includes("/setup");
    // Locked -> skip this (probe) test; the guard on the wizard test below
    // carries the same decision forward so it never runs against a locked DB.
    test.skip(setupLocked, "setup already complete — wizard suite skipped");
  });

  test("completes the wizard and locks /setup", async ({ page }) => {
    test.skip(setupLocked, "setup already complete — wizard suite skipped");

    test.setTimeout(90_000); // cold Turbopack compiles on first /setup hit
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: /set up tripmate/i })).toBeVisible();

    // Account: create the superadmin (min-10 password passes)
    const email = page.getByLabel(/email address|email/i);
    await email.fill("admin@tripmate.test");
    await expect(email).toHaveValue("admin@tripmate.test");
    const name = page.getByLabel(/full name/i);
    await name.fill("Super Admin");
    await expect(name).toHaveValue("Super Admin");
    const password = page.getByLabel(/^password$/i);
    await password.fill("supersecret123");
    await expect(password).toHaveValue("supersecret123");
    await page.getByRole("button", { name: /create admin account/i }).click();
    await expect(page.getByRole("heading", { name: /site identity/i })).toBeVisible();

    // Site: seeded row -> configured summary -> continue
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^storage$/i })).toBeVisible();

    // Storage: local is the seeded default -> configured summary -> continue
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: /email \(smtp\)/i })).toBeVisible();

    // SMTP: optional, skip without a test send
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(page.getByRole("heading", { name: /meta pixel/i })).toBeVisible();

    // Meta: skip
    await page.getByRole("button", { name: /skip this step/i }).click();
    await expect(page.getByRole("heading", { name: /almost done/i })).toBeVisible();

    // Complete -> success screen with a link onward to /login
    await page.getByRole("button", { name: /finish setup/i }).click();
    await expect(page.getByRole("heading", { name: /setup complete/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /continue to login/i })).toBeVisible();

    // Locked now: a second visit to /setup redirects off it
    await page.goto("/setup");
    await expect(page).not.toHaveURL(/setup/);
    await expect(page).toHaveURL(/\/$/);
  });
});
