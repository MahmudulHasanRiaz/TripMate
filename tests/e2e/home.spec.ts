import { test, expect } from "@playwright/test";

// =============================================================================
// Home page e2e (Task 10) — the cached marketing home against a SEEDED dev DB.
//
// Depends on the dev DB carrying the Plan-1 seed: settings.home (hero copy,
// site.phone for the closing CTA), 6 service categories, 3 published listings.
// The seed creates NO posts, so the journal band must handle the empty state —
// but content-admin.spec may leave a live post behind on a crashed run, so the
// blog assertions branch on whether teaser cards rendered.
//
// Note on catalog residue: catalog-admin.spec permanently keeps its "Beach
// Tours" category ACTIVE, so the service grid can show 6 OR 7 tiles. We assert
// the six seeded services are present rather than an exact total. Featured
// packages are capped at 3 by the page and the catalog spec trashes its own
// listings, so exactly the three seeded package cards render.
// =============================================================================

const HERO_HEADLINE = "Travel better. We'll handle the rest."; // settings.home (seed)
const SEEDED_SERVICES = [
  "Flight Tickets",
  "Hotel Booking",
  "Tour Packages",
  "Hajj Packages",
  "Umrah Packages",
  "Medical Travel",
  "Visa Concierge",
  "Passport Services",
];
const SEEDED_PACKAGES = [
  "Premium Executive Hajj 2026",
  "Executive Umrah 14-Day Spiritual Journey",
  "Malaysia & Singapore 7-Day Family Escape",
];

test("home renders the settings-driven hero", async ({ page }) => {
  await page.goto("/");

  const h1 = page.getByRole("heading", { level: 1, name: HERO_HEADLINE, exact: true });
  await expect(h1).toBeVisible();

  // Single primary CTA in the hero viewport points at /packages. ("Explore
  // packages" also labels the closing CTASection lower on the page, so take the
  // first match — the hero is the first main landmark content.)
  const cta = page
    .getByRole("main")
    .getByRole("link", { name: "Explore packages", exact: true })
    .first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/packages");
});

test("home shows the six seeded services as grid cards", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Every journey, planned with care" }),
  ).toBeVisible();

  for (const name of SEEDED_SERVICES) {
    await expect(
      page.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }
});

test("home features the three seeded packages", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hand-picked trips for every traveller" }),
  ).toBeVisible();

  const cards = page.locator('main a[href^="/packages/"]');
  await expect(cards).toHaveCount(3);

  for (const title of SEEDED_PACKAGES) {
    await expect(cards.filter({ hasText: title })).toBeVisible();
  }

  // The section header carries the "View all" escape to the packages index.
  await expect(
    page.getByRole("link", { name: "View all packages", exact: true }),
  ).toBeVisible();
});

test("home renders the stats band and journal section (empty-state tolerant)", async ({
  page,
}) => {
  await page.goto("/");

  // StatsBand: static v1 copy.
  await expect(page.getByText("12+", { exact: true })).toBeVisible();
  await expect(page.getByText("Years of service", { exact: true })).toBeVisible();

  // Journal band always has a heading; the body is cards OR the empty state.
  await expect(
    page.getByRole("heading", { name: "From the road", exact: true }),
  ).toBeVisible();

  const teaserCards = page.locator('[data-testid="blog-teaser-grid"] article');
  const cardCount = await teaserCards.count();

  if (cardCount === 0) {
    await expect(
      page.getByText("Travel stories, guides and inspiration are on the way."),
    ).toBeVisible();
  } else {
    expect(cardCount).toBeGreaterThanOrEqual(1);
    expect(cardCount).toBeLessThanOrEqual(3);
  }
});

test("home closing CTA surfaces the settings phone + WhatsApp", async ({ page }) => {
  await page.goto("/");

  // The band's headline is the h2; its single primary action is the
  // "Explore packages" link (already asserted against the hero), so here we pin
  // the market's quiet phone + WhatsApp contact escapes instead.
  await expect(
    page.getByRole("heading", { level: 2, name: "Let's plan your next journey" }),
  ).toBeVisible();

  // Bengali-market contact escapes, driven by settings.site.phone (seed).
  await expect(
    page.locator('main a[href="tel:+8801711234567"]'),
  ).toBeVisible();
  await expect(
    page.locator('main a[href="https://wa.me/8801711234567"]'),
  ).toBeVisible();
});
