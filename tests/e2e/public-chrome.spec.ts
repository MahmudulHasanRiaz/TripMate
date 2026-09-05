import { test, expect } from "@playwright/test";

// =============================================================================
// Public chrome e2e: the (public) route-group shell + shared design-system
// components (Task 9). Proves the header (settings-driven title, nav, theme
// toggle), footer, mobile sheet, skip link and the branded 404 all render.
//
// Each test gets a fresh browser context, so localStorage (the saved theme)
// starts empty and the pre-paint script defaults to light — making the theme
// assertions deterministic. No DB mutation here.
// =============================================================================

test.describe("public chrome", () => {
  test("home renders header (site title + nav) and footer", async ({ page }) => {
    await page.goto("/");

    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
    // Brand lockup is settings-driven (site.title from the DB / default).
    await expect(header.getByText("TripMate")).toBeVisible();

    const mainNav = header.getByRole("navigation", { name: "Main" });
    await expect(mainNav).toBeVisible();
    for (const label of ["Packages", "Blog", "About"]) {
      await expect(
        mainNav.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }

    await expect(page.getByRole("main")).toBeVisible();
    // The marketing hero owns the page's single h1 (settings.home headline —
    // asserted by name in home.spec.ts; here we only pin the landmark shape).
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();

    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/© TripMate/)).toBeVisible();
  });

  test("theme toggle flips html.dark and persists across reload", async ({
    page,
  }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/); // fresh context -> light default

    const toDark = page.getByRole("button", { name: "Switch to dark theme" });
    await toDark.click();
    await expect(html).toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("tripmate-theme")),
    ).toBe("dark");

    // Reload: the pre-paint inline script must re-apply .dark before paint.
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    // Toggle back to light leaves a clean state.
    await page
      .getByRole("button", { name: "Switch to light theme" })
      .click();
    await expect(html).not.toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("tripmate-theme")),
    ).toBe("light");
  });

  test("skip link is focusable and jumps keyboard focus to main", async ({
    page,
  }) => {
    await page.goto("/");

    const skip = page.getByRole("link", { name: "Skip to content" });
    // Visually hidden via sr-only (clipped 1px box) — Playwright counts that as
    // "visible", so we assert the functional contract instead: first Tab lands
    // on the bypass, Enter hands focus to the main landmark.

    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator("#main")).toBeFocused();
  });

  test("unknown route shows 404 with the public chrome", async ({ page }) => {
    await page.goto("/no-such-page-xyz");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByText("This page wandered off the itinerary."),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});

test.describe("public chrome — mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile sheet menu opens and lists the nav links", async ({ page }) => {
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Open menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    for (const label of ["Packages", "Blog", "About"]) {
      await expect(
        sheet.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });
});
