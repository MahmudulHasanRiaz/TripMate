import { expect, test, type Page } from "@playwright/test";

// The auth pages are the FIRST live better-auth credential round-trip (Plan 2
// ledger note from T1): a real authClient.signIn.email against the seeded
// superadmin exercises the uuid id-generation, the local:credential issuer
// account path, and a session read-back. If these fail at runtime it is a REAL
// finding — investigate and report, don't paper over.
//
// Prerequisites: the dev DB is set up (setup COMPLETE, admin user exists).
// Cross-file e2e ordering + idempotency is Task 13's job.
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";
const UNIFORM_ERROR = "Invalid email or password.";

test.setTimeout(60_000); // cold Turbopack compiles the /login + /api/auth routes

// Scope to <main>: Next injects its own <div role="alert"> route announcer into
// <body>, so an unscoped getByRole("alert") is ambiguous.
const errorAlert = (page: Page) => page.locator("main").getByRole("alert");
const wait = { timeout: 20_000 }; // first POST cold-compiles the API route

test("rejects a wrong password with the uniform error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill("wrongpassword1");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Exact copy — the server's real "Invalid password" message must NOT leak.
  await expect(errorAlert(page)).toHaveText(UNIFORM_ERROR, wait);
});

test("shows the SAME copy for an unknown email (no account-existence leak)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("no-such-user@tripmate.test");
  await page.getByLabel(/password/i).fill("wrongpassword1");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Identical to the wrong-password case — an attacker can't tell the two apart.
  await expect(errorAlert(page)).toHaveText(UNIFORM_ERROR, wait);
});

test("signs in with valid credentials and lands logged in with a session cookie", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Client navigation lands on "/".
  await expect(page).toHaveURL(/\/$/, wait);

  // A better-auth session cookie exists (assert existence, not value).
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) =>
    c.name.toLowerCase().includes("session"),
  );
  expect(sessionCookie, "expected a session cookie after login").toBeTruthy();
  expect(sessionCookie?.value.length).toBeGreaterThan(0);

  // Server-side proof: a logged-in user visiting /login is bounced back to "/".
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/, wait);
});
