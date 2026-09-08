import { expect, test, type Page } from "@playwright/test";

// =============================================================================
// Plan-level PUBLIC-FLOWS e2e (Plan 3 Task 15) — the full customer journey plus
// the admin→public cache-invalidation proof (Task 5's deferred verification)
// against a SEEDED dev DB.
//
// Test 1 "full public journey" rides ONE admin session end to end:
//   1. login as admin, trash crash-residue of this spec's post title
//   2. create + publish a post ("Journey Chronicles: Sylhet", Travel Tips) —
//      the /blog post-detail route has NEVER been e2e-covered before (Task 12
//      review gap), so this spec finally drives a live post through /blog →
//      /blog/[slug] and asserts author/date/markdown-body/back-link
//   3. home (hero + services) → click the featured Hajj card → package detail
//      (itinerary + price) → back → /packages filter by category → /blog → post
//      detail → /p/about-us (markdown heading) → theme toggle persists across
//      nav → unknown-route 404
//   4. ALWAYS trashes the post in `finally` so re-runs (and the services-blog
//      empty-state spec that sorts right after this file) start from 0 live
//      posts. A crashed run leaves the live post behind; the NEXT run's step 1
//      cleans it before services-blog runs.
//
// Test 2 "admin edit invalidates the public package grid" is the Task-5 proof:
//   login → append " (e2e v2)" to the seeded Hajj listing's title → save →
//   /packages?q=hajj shows the NEW title (cache revalidated) → restore the
//   original title → /packages?q=hajj shows it again. The title change never
//   touches the slug (the edit form keeps an existing slug), and the test
//   self-heals a previous crashed run (strips a leftover marker before it
//   re-applies). Residue of a marker can never break the substring-based title
//   assertions in home/packages/smoke specs, so a mid-crash here is safe.
//
// Ordering / idempotency notes:
//   * Sorted AFTER public-chrome.spec.ts and BEFORE services-blog.spec.ts
//     (alphabetical + workers: 1), so by the time services-blog asserts the
//     /blog EMPTY state, this spec has already trashed its post.
//   * Trashed posts with the base slug persist, so a re-create lands on
//     `journey-chronicles-sylhet-2`, `-3`, … — assertions accept base or suffix.
//   * Each test = a fresh browser context, so theme/localStorage and filters
//     never leak between tests.
// =============================================================================
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";
const SUPERADMIN_NAME = "Super Admin"; // 00-setup wizard sets this display name

const POST_TITLE = "Journey Chronicles: Sylhet";
const POST_CATEGORY = "Travel Tips";
const POST_EXCERPT =
  "Tea gardens, Ratargul's flooded forest and three unhurried days in the tea capital.";
const POST_CONTENT = [
  "## The hills of Sylhet",
  "",
  "From Ratargul's flooded forest to Lawachara's canopy walks, Sylhet rewards slow travellers. Srimangal — the tea capital — is an easy day trip by local train.",
  "",
  "- **Tea gardens** around Srimangal",
  "- **Ratargul** swamp-forest boat ride",
  "- **Jaflong** by the river",
  "",
  "Plan at least three days to see it properly.",
].join("\n");
const POST_BASE_SLUG = /journey-chronicles-sylhet(-\d+)?/;

const HAJJ_TITLE = "Premium Executive Hajj 2026";
const HAJJ_MARK = " (e2e v2)";

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

test.setTimeout(150_000); // one long journey over admin + several public routes
const wait = { timeout: 20_000 };
const poll = { timeout: 25_000 };

/** Sign in as the seeded superadmin (retry loop guards the hydration wipe). */
async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(async () => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await expect(page.getByLabel(/email/i)).toHaveValue(ADMIN_EMAIL, { timeout: 1_000 });
    await expect(page.getByLabel(/password/i)).toHaveValue(ADMIN_PASSWORD, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, wait);
}

/** Fill guarding the hydration race: values typed pre-hydration get wiped. */
async function stickyFill(locator: import("@playwright/test").Locator, value: string) {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/** Pick a Radix Select option and verify the trigger shows it (hydration-safe). */
async function chooseSelect(page: Page, triggerName: RegExp, optionText: string) {
  const trigger = page.getByRole("combobox", { name: triggerName });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: optionText, exact: true }).click();
    await expect(trigger).toContainText(optionText, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

function postRow(page: Page, title: string) {
  return page
    .locator("tbody tr")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** Trash any LIVE rows with this title (crash residue), newest count capped. */
async function trashLivePosts(page: Page, title: string) {
  // The posts list can paint EMPTY for a beat after a cold goto (Turbopack
  // compile), so an immediate row-count of 0 does NOT prove the post is gone —
  // gate 2 caught a live post left behind this way. Wait for the results-count
  // line first: once it renders, the table reflects the DB, and a matching row
  // can no longer hide behind an empty first paint.
  await expect(page.getByText(/\d+ result/i)).toBeVisible({ timeout: wait.timeout });
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = postRow(page, title).first();
    if ((await row.count()) === 0) return;
    await row.getByRole("button", { name: `Trash ${title}` }).click();
    await page.getByRole("button", { name: "Trash post" }).click();
    await expect(postRow(page, title).first()).toHaveCount(0, wait);
  }
}

/** The seeded Hajj listing's admin table row (title link -> edit page). */
function hajjListingRow(page: Page) {
  return page.locator("tbody tr").filter({ hasText: HAJJ_TITLE }).first();
}

/** Full /packages?q=hajj visit; true when a grid card contains `needle`. */
async function hajjGridHas(page: Page, needle: string): Promise<boolean> {
  await page.goto("/packages?q=hajj");
  const grid = page.getByTestId("package-grid");
  await grid.waitFor({ state: "attached", timeout: 5_000 }).catch(() => undefined);
  return (await page.getByTestId("package-grid").filter({ hasText: needle }).count()) > 0;
}

/** Open the Hajj listing's edit page from the admin table. */
async function openHajjEdit(page: Page) {
  await page.goto("/admin/catalog/listings");
  const row = hajjListingRow(page);
  await expect(row).toBeVisible(wait);
  // HAJJ_TITLE contains no regex metacharacters; optional marker = crashed-run
  // residue the test may be about to strip.
  await row
    .getByRole("link", { name: new RegExp(`^${HAJJ_TITLE}( \\(e2e v2\\))?$`) })
    .click();
  await expect(page.getByRole("heading", { name: "Edit listing" })).toBeVisible(wait);
}

/** Read the edit form's current Title value. */
async function currentListingTitle(page: Page): Promise<string> {
  const title = page.getByLabel(/^Title$/i);
  await expect(title).toBeVisible(wait);
  return (await title.inputValue()).trim();
}

test("full public journey — publish a post, then home → package detail → filter → blog post → about → theme → 404", async ({
  page,
}) => {
  await signInAsAdmin(page);

  // Create + publish the post that the /blog leg will read. Everything after is
  // wrapped so the post is ALWAYS trashed — even if an assertion fails — keeping
  // re-runs and the services-blog empty-state spec green.
  try {
    await test.step("clean live post residue from a previous run", async () => {
      await page.goto("/admin/content/posts");
      await trashLivePosts(page, POST_TITLE);
    });

    await test.step("create a draft post under Travel Tips", async () => {
      await page.goto("/admin/content/posts/new");
      await expect(page.getByRole("heading", { name: "New post" })).toBeVisible(wait);
      await stickyFill(page.getByLabel(/^Title$/i), POST_TITLE);
      await chooseSelect(page, /^Category$/i, POST_CATEGORY);
      // getByRole('textbox'): getByLabel('Content') ALSO matches the surrounding
      // <section aria-labelledby="post-content-heading"> region, so target the
      // textarea role to stay strict-mode clean.
      await stickyFill(page.getByRole("textbox", { name: /^Excerpt$/i }), POST_EXCERPT);
      await stickyFill(page.getByRole("textbox", { name: /^Content$/i }), POST_CONTENT);
      await page.getByRole("button", { name: /create post/i }).click();
      await expect(page).toHaveURL(/\/admin\/content\/posts$/, wait);
      const row = postRow(page, POST_TITLE).first();
      await expect(row).toBeVisible(wait);
      await expect(row).toContainText(POST_CATEGORY);
      await expect(row).toContainText("Draft");
      await expect(row).toContainText(POST_BASE_SLUG);
    });

    await test.step("publish the post", async () => {
      const row = postRow(page, POST_TITLE).first();
      await row.getByRole("button", { name: "Publish" }).click();
      await expect(row).toContainText("Published", wait);
    });

    await test.step("home renders the hero and service cards", async () => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: "Travel better. We'll handle the rest.", exact: true }),
      ).toBeVisible(wait);
      await expect(
        page.getByRole("heading", { name: "Every journey, planned with care" }),
      ).toBeVisible();
      for (const name of SEEDED_SERVICES) {
        await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
      }
    });

    await test.step("click the featured Hajj card into its detail", async () => {
      // The featured band (capped at 3) shows the three seeded packages on a
      // healthy DB; the Hajj card deep-links to the detail route with itinerary.
      const hajjCard = page.locator('main a[href="/packages/premium-executive-hajj-2026"]');
      await expect(hajjCard.first()).toBeVisible(wait);
      await hajjCard.first().click();
      await expect(page).toHaveURL(/\/packages\/premium-executive-hajj-2026$/, wait);
    });

    await test.step("package detail shows itinerary, price and enquiry CTA", async () => {
      await expect(
        page.getByRole("heading", { level: 1, name: HAJJ_TITLE }),
      ).toBeVisible(wait);
      await expect(page.getByTestId("package-price")).toContainText("৳");
      await expect(
        page.getByRole("heading", { name: "Itinerary", exact: true }),
      ).toBeVisible();
      const itinerary = page.locator('[data-testid="package-itinerary"] details');
      await expect(itinerary.first()).toBeVisible(wait);
      await itinerary.first().locator("summary").click();
      await expect(itinerary.first()).toHaveAttribute("open", "");
      await expect(itinerary.first().locator("p").first()).not.toBeEmpty();
      await expect(
        page.getByRole("main").getByRole("link", { name: "Enquire by email" }),
      ).toBeVisible();
    });

    await test.step("go back, then /packages filter by category", async () => {
      await page.goBack();
      await expect(page).toHaveURL(/\/$/, wait);

      await page
        .getByRole("banner")
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Packages", exact: true })
        .click();
      await expect(page).toHaveURL(/\/packages\/?$/, wait);
      await expect(page.getByTestId("package-grid")).toBeVisible(wait);

      // Narrow to Umrah — exactly one live package shares that category.
      await page.getByRole("combobox", { name: "Category" }).selectOption("umrah");
      await expect(page).toHaveURL(/[?&]cat=umrah(?:&|$)/);
      const grid = page.getByTestId("package-grid");
      await expect(grid.locator("a")).toHaveCount(1, wait);
      await expect(grid.filter({ hasText: "Executive Umrah 14-Day Spiritual Journey" })).toBeVisible();
    });

    await test.step("/blog lists the published post and opens its detail", async () => {
      await page.goto("/blog");
      await expect(
        page.getByRole("heading", { level: 1, name: "Stories from the road" }),
      ).toBeVisible(wait);

      // Residue tolerance: a crashed content-admin run could leave a live "Test
      // Explorer Notes" row, so assert OUR card is present (>= 1) not "1 card".
      await expect(page.getByTestId("blog-grid")).toBeVisible(wait);
      const ourCard = page.getByRole("link", { name: POST_TITLE, exact: true }).first();
      await expect(ourCard).toBeVisible(wait);
      await ourCard.click();
      await expect(page).toHaveURL(/\/blog\/[\w-]+$/, wait);
    });

    await test.step("post detail asserts category, date, author and prose", async () => {
      // Client nav from /blog leaves a HIDDEN copy of the old index in the DOM
      // (its grid keeps matching locators even though innerText excludes it), so
      // every broad text assert below filters to VISIBLE nodes only. The detail
      // <h1> is the settle signal: it only exists once the article is committed.
      await expect(
        page.getByRole("heading", { level: 1, name: POST_TITLE }),
      ).toBeVisible(wait);

      // Eyebrow category (visible-only: a hidden leftover card can share it).
      await expect(
        page.getByText(POST_CATEGORY, { exact: true }).filter({ visible: true }),
      ).toBeVisible(wait);

      // Author (server-stamped from the session on create = the setup user).
      // Scoped to the article <header>: the lingering index cards have none.
      await expect(
        page.locator("article header").getByText(SUPERADMIN_NAME, { exact: true }),
      ).toBeVisible(wait);

      // Published date renders as a machine-readable <time dateTime>.
      const time = page.locator("article header time");
      await expect(time).toHaveCount(1, wait);
      await expect(time).toHaveAttribute("dateTime", /^\d{4}-\d{2}-\d{2}$/);

      // The markdown body renders as sanitized prose (heading + list + para).
      // Visible filter keeps the hidden card remnant (whose excerpt shares the
      // "Ratargul's flooded forest" phrase) from tripping strict mode.
      await expect(
        page.getByRole("heading", { level: 2, name: "The hills of Sylhet" }),
      ).toBeVisible(wait);
      await expect(
        page.getByText(/Ratargul's flooded forest/i).filter({ visible: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("listitem").filter({ hasText: "Tea gardens" }),
      ).toBeVisible();

      // Back link to the index.
      await expect(
        page.getByRole("link", { name: "Back to the journal", exact: true }),
      ).toHaveAttribute("href", "/blog");
    });

    await test.step("/p/about-us renders the seeded markdown page", async () => {
      await page.goto("/p/about-us");
      await expect(
        page.getByRole("heading", { level: 1, name: "About Us" }),
      ).toBeVisible(wait);
      await expect(page.getByText(/Dhaka-based travel agency/i)).toBeVisible();
    });

    await test.step("theme toggle persists across client nav and a full load", async () => {
      const html = page.locator("html");
      await expect(html).not.toHaveClass(/dark/); // fresh context -> light

      await page.getByRole("button", { name: "Switch to dark theme" }).click();
      await expect(html).toHaveClass(/dark/);

      // Client-side nav (same document): the class must not reset.
      await page
        .getByRole("banner")
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Blog", exact: true })
        .click();
      await expect(page).toHaveURL(/\/blog\/?$/, wait);
      await expect(html).toHaveClass(/dark/);

      // Full server load: the pre-paint script re-applies the saved theme.
      await page.goto("/packages");
      await expect(html).toHaveClass(/dark/);
      expect(
        await page.evaluate(() => localStorage.getItem("tripmate-theme")),
      ).toBe("dark");
    });

    await test.step("unknown route shows the branded 404", async () => {
      await page.goto("/this-page-does-not-exist-xyz");
      await expect(page.getByText(/wandered off the itinerary/i)).toBeVisible(wait);
      await expect(page.getByRole("banner")).toBeVisible();
    });
  } finally {
    // Cleanup: leave the DB with 0 live posts so re-runs and services-blog stay
    // green. Idempotent and safe if we never even logged in (login redirects the
    // posts route and no matching row exists to trash).
    await page.goto("/admin/content/posts");
    await trashLivePosts(page, POST_TITLE);
  }
});

test("admin edit invalidates the cached public package grid (Task-5 proof)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);

  try {
    // Open the edit form, read the CURRENT title, and derive the pristine base
    // (self-heals a leftover " (e2e v2)" from a crashed earlier run).
    await openHajjEdit(page);
    const current = await currentListingTitle(page);
    const base = current.endsWith(HAJJ_MARK) ? current.slice(0, -HAJJ_MARK.length) : current;
    expect(base, "the seeded Hajj title should resolve to the known base").toBe(HAJJ_TITLE);
    const altered = `${base}${HAJJ_MARK}`;

    await test.step("append the marker to the Hajj title and save", async () => {
      await stickyFill(page.getByLabel(/^Title$/i), altered);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page).toHaveURL(/\/admin\/catalog\/listings$/, wait);
    });

    await test.step("the public /packages grid shows the NEW title (revalidated)", async () => {
      // The listings tag was expired by the save's updateTag; a fresh
      // /packages?q=hajj read must render the edited title (poll re-navigates in
      // case the revalidation lands a beat after the write).
      await expect
        .poll(async () => hajjGridHas(page, altered), poll)
        .toBe(true);
    });

    await test.step("restore the original title and save", async () => {
      await openHajjEdit(page);
      await stickyFill(page.getByLabel(/^Title$/i), base);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page).toHaveURL(/\/admin\/catalog\/listings$/, wait);
    });

    await test.step("the public grid shows the restored title, marker gone", async () => {
      await expect.poll(async () => hajjGridHas(page, base), poll).toBe(true);
      await expect.poll(async () => !(await hajjGridHas(page, altered)), poll).toBe(true);
    });
  } finally {
    // Safety net: if any step above aborted mid-edit, leave the DB title pristine
    // so downstream runs (home/packages/smoke substring asserts) stay stable.
    await page.goto("/admin/catalog/listings");
    if (!/\/login$/.test(page.url())) {
      const row = hajjListingRow(page);
      if ((await row.count()) > 0) {
        await row.getByRole("link").first().click();
        await expect(page.getByRole("heading", { name: "Edit listing" })).toBeVisible({ timeout: 10_000 });
        const leftover = await currentListingTitle(page);
        if (leftover.endsWith(HAJJ_MARK)) {
          await stickyFill(page.getByLabel(/^Title$/i), leftover.slice(0, -HAJJ_MARK.length));
          await page.getByRole("button", { name: "Save changes" }).click();
          await expect(page).toHaveURL(/\/admin\/catalog\/listings$/, wait);
        }
      }
    }
  }
});
