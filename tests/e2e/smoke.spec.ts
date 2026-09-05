import { test, expect } from "@playwright/test";

test("home renders the foundation placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TripMate");
});

test("unknown route renders custom 404 copy", async ({ page }) => {
  await page.goto("/this-does-not-exist");
  await expect(
    page.getByText("This page wandered off the itinerary."),
  ).toBeVisible();
});
