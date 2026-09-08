import { expect, test, type Page } from "@playwright/test";

// =============================================================================
// Packages listing + detail e2e (Plan 3 Task 11) against a SEEDED dev DB.
//
// Residue tolerance: earlier admin specs leave several "Beach Tours" listings
// (cox-beach-escape-*) in the dev DB. listPublishedListings is newest-first, so
// those rows can sit ahead of the three seeded packages on page 1 — presence
// tests therefore scan the first pages for a card rather than asserting the
// default page exactly, while the category (Umrah) and search (hajj) filters
// still resolve to exactly one card each because no residue shares those terms.
// =============================================================================

const GRID = '[data-testid="package-grid"]';

const SEEDED = [
  { title: "Premium Executive Hajj 2026", query: "hajj" },
  { title: "Executive Umrah 14-Day Spiritual Journey", query: "umrah" },
  { title: "Malaysia & Singapore 7-Day Family Escape", query: "malaysia" },
];

/** Walk pages 1..4 of the index looking for a card whose text includes title. */
async function hasSeededCard(page: Page, title: string): Promise<boolean> {
  for (let p = 1; p <= 4; p++) {
    await page.goto(p > 1 ? `/packages?page=${p}` : "/packages");
    await expect(page.locator(GRID)).toBeVisible();
    if ((await page.locator(GRID).filter({ hasText: title }).count()) > 0) {
      return true;
    }
  }
  return false;
}

test("/packages lists the three seeded package cards (residue-tolerant)", async ({
  page,
}) => {
  for (const seed of SEEDED) {
    await expect
      .poll(async () => hasSeededCard(page, seed.title), { timeout: 20_000 })
      .toBe(true);
  }
});

test("filtering by category narrows to the Umrah package", async ({ page }) => {
  await page.goto("/packages");

  await page.getByRole("combobox", { name: "Category" }).selectOption("umrah");

  await expect(page).toHaveURL(/[?&]cat=umrah(?:&|$)/);
  await expect(page.locator(GRID).locator("a")).toHaveCount(1);
  await expect(
    page.locator(GRID).filter({ hasText: "Executive Umrah 14-Day Spiritual Journey" }),
  ).toBeVisible();
  await expect(page.locator(GRID)).not.toContainText("Premium Executive Hajj 2026");
});

test("searching 'hajj' narrows to the Hajj package", async ({ page }) => {
  await page.goto("/packages");

  await page.getByRole("textbox", { name: "Search packages" }).fill("hajj");

  await expect(page).toHaveURL(/[?&]q=hajj(?:&|$)/);
  await expect(page.locator(GRID).locator("a")).toHaveCount(1);
  await expect(
    page.locator(GRID).filter({ hasText: "Premium Executive Hajj 2026" }),
  ).toBeVisible();
});

test("package detail shows itinerary, price and the phone/WhatsApp/email CTAs", async ({
  page,
}) => {
  // Reach the Hajj card through its deterministic search filter (the default
  // page can be dominated by residue), then click into the detail route.
  await page.goto("/packages?q=hajj");
  await page.locator('a[href="/packages/premium-executive-hajj-2026"]').click();

  await expect(page).toHaveURL(/\/packages\/premium-executive-hajj-2026$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Premium Executive Hajj 2026" }),
  ).toBeVisible();

  // Price card (desktop sidebar).
  await expect(page.getByTestId("package-price")).toContainText("৳");

  // Enquiry CTAs — settings.site phone/email (seed).
  await expect(page.locator('main a[href^="tel:"]').first()).toBeVisible();
  await expect(page.locator('main a[href^="https://wa.me/"]').first()).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Enquire by email" }),
  ).toBeVisible();

  // Itinerary renders as server <details> rows; opening the first reveals text.
  await expect(
    page.getByRole("heading", { name: "Itinerary", exact: true }),
  ).toBeVisible();
  const itinerary = page.locator('[data-testid="package-itinerary"] details');
  await expect(itinerary.first()).toBeVisible();
  // Native <details>: the day paragraph is hidden until the summary opens it.
  await expect(itinerary.first().locator("p").first()).toBeHidden();
  await itinerary.first().locator("summary").click();
  await expect(itinerary.first()).toHaveAttribute("open", "");
  await expect(itinerary.first().locator("p").first()).toBeVisible();
  await expect(itinerary.first().locator("p").first()).not.toBeEmpty();
});

test("unknown package slug returns the site 404", async ({ page }) => {
  await page.goto("/packages/definitely-not-a-real-package");

  await expect(page.getByText(/wandered off/i)).toBeVisible();
});
