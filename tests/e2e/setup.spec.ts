import { test, expect } from "@playwright/test";

// Runs FIRST in the e2e suite (Task 13 renames to 00-setup + adds idempotency).
// MUTATES the dev DB on purpose: creates superadmin admin@tripmate.test and
// locks setup — later auth/admin specs depend on exactly this state.
test.describe.serial("setup wizard", () => {
  test("completes and locks", async ({ page }) => {
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
