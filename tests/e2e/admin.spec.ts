import { test, expect } from "@playwright/test";

// Admin shell e2e: proves the server layout gates the route and that the
// permission-filtered menu renders for a superadmin. Prerequisites: the dev DB
// is set up (setup COMPLETE, superadmin admin@tripmate.test exists). Cross-file
// e2e ordering + idempotency is Task 13's job.
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";

test.setTimeout(60_000); // cold Turbopack compiles /admin + /login + /api/auth
const wait = { timeout: 20_000 }; // first hits cold-compile routes

test("admin shell loads for superadmin with permission-filtered menu", async ({
  page,
}) => {
  // Sign in as the seeded superadmin. The fill/assert retry loop guards a
  // React hydration race: values typed before the client bundle hydrates get
  // wiped when the controlled inputs mount, so we only proceed once the typed
  // values "stick" (i.e. hydration has finished). Keeps this spec independent
  // of whether another spec warmed /login first.
  await page.goto("/login");
  await expect(async () => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await expect(page.getByLabel(/email/i)).toHaveValue(ADMIN_EMAIL, {
      timeout: 1_000,
    });
    await expect(page.getByLabel(/password/i)).toHaveValue(ADMIN_PASSWORD, {
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, wait);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();
  // Users.manage is a superadmin-only permission — present for superadmin.
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  // The dashboard stat card proves the server-side menu filter ran.
  await expect(page.getByText("Menu sections")).toBeVisible();
});

test("anonymous visitors are redirected from /admin to /login", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/, wait);
});
