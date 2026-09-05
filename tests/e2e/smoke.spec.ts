import { test, expect } from "@playwright/test";

test("home renders the foundation placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("TripMate");
});

test("unknown route renders 404 page", async ({ page }) => {
  await page.goto("/this-does-not-exist");
  await expect(page.getByText("404")).toBeVisible();
});
