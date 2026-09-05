import { test, expect } from "@playwright/test";

test("home renders the marketing hero and package grid", async ({ page }) => {
  await page.goto("/");
  // Marketing hero owns the single h1 (settings.home headline).
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Seeded catalog: featured package cards deep-link into /packages/{slug}.
  await expect(page.locator('main a[href^="/packages/"]').first()).toBeVisible();
});

test("unknown route renders custom 404 copy", async ({ page }) => {
  await page.goto("/this-does-not-exist");
  await expect(
    page.getByText("This page wandered off the itinerary."),
  ).toBeVisible();
});
