import { expect, test, type Page } from "@playwright/test";

// =============================================================================
// Orders + Payments + Expenses + Reports Golden Path E2E Test (Plan 5)
//
// Golden path walkthrough:
//   1. Public booking on /packages/premium-hajj-2026 via BookingForm modal.
//   2. Extract and assert unique orderNo from order-number-display.
//   3. Sign in as admin.
//   4. Verify order appears on /admin/orders board under pending.
//   5. Open /admin/orders/[id], compose and save quote (flips to confirmed).
//   6. Record offline payment for full quote amount.
//   7. Go to /admin/payments verification queue, verify the payment.
//   8. Return to order detail: assert status is confirmed and paid total matches.
//   9. Submit expense linked to order on /admin/expenses, approve it.
//  10. Open /admin/expenses/reports: assert revenue and expense cards are nonzero.
// =============================================================================

const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";

test.setTimeout(90_000); // Cold Turbopack compilation of multiple admin workspaces
const wait = { timeout: 20_000 };

async function signInAsAdmin(page: Page) {
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
}

test("golden path: booking -> pending -> quote -> pay -> verify -> confirmed -> expense -> P&L", async ({
  page,
}) => {
  const timestamp = Date.now();
  const customerName = `E2E Pilgrim ${timestamp}`;
  const customerPhone = "+8801700000001";
  const customerEmail = `pilgrim-${timestamp}@tripmate.test`;
  const travelerName = `Traveler ${timestamp}`;

  // ---------------------------------------------------------------------------
  // Step 1: Public Booking on /packages/premium-executive-hajj-2026
  // ---------------------------------------------------------------------------
  await page.goto("/packages/premium-executive-hajj-2026");
  await expect(
    page.getByRole("heading", { level: 1, name: /Premium Executive Hajj 2026/i }),
  ).toBeVisible(wait);

  // Open BookingForm dialog (desktop sidebar or mobile bar)
  const bookButton = page.getByRole("button", { name: "Book Now" }).first();
  await expect(bookButton).toBeVisible();
  await bookButton.click();

  // Wait for dialog
  await expect(
    page.getByRole("heading", { name: /Book.*Premium Executive Hajj 2026/i }),
  ).toBeVisible();

  // Fill customer details
  await page.getByRole("textbox", { name: /^full name \*/i }).fill(customerName);
  await page.getByRole("textbox", { name: /^phone number/i }).fill(customerPhone);
  await page.getByRole("textbox", { name: /^email address/i }).fill(customerEmail);

  // Fill primary traveler details
  await page.getByRole("textbox", { name: /^full name as on passport/i }).fill(travelerName);

  // Fill special requests
  await page.locator("textarea").fill("Wheelchair assistance and ground floor room requested.");

  // Advance to Step 2 (Payment Method)
  await page.getByRole("button", { name: /proceed to payment/i }).click();

  // Wait for step 2 heading
  await expect(page.getByText("Select Payment Gateway")).toBeVisible(wait);

  // Submit booking (no gateways configured — "Confirm & Place Order" is always visible)
  await page.getByRole("button", { name: /confirm & place order/i }).click();

  // Wait for success screen and capture orderNo
  const orderNumberDisplay = page.locator('[data-testid="order-number-display"]');
  await expect(orderNumberDisplay).toBeVisible(wait);

  const orderNoRaw = await orderNumberDisplay.textContent();
  expect(orderNoRaw).toBeTruthy();
  const orderNo = orderNoRaw!.trim();
  expect(orderNo).toMatch(/^TM-\d{4}-\d{5}$/);

  // Close booking dialog
  await page.getByRole("button", { name: "Close" }).first().click();

  // ---------------------------------------------------------------------------
  // Step 2 & 3: Admin Sign In & Orders Board
  // ---------------------------------------------------------------------------
  await signInAsAdmin(page);

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible(wait);

  // Assert order appears under pending column
  const pendingColumn = page.locator('[data-testid="board-column-pending"]');
  await expect(pendingColumn).toBeVisible();

  const orderBoardLink = pendingColumn.locator(`a:has-text("${orderNo}")`);
  await expect(orderBoardLink).toBeVisible(wait);

  // Navigate to order detail
  const orderHref = await orderBoardLink.getAttribute("href");
  expect(orderHref).toBeTruthy();
  await page.goto(orderHref!);
  await expect(page).toHaveURL(/\/admin\/orders\/[a-f0-9-]+$/, wait);

  const orderId = page.url().split("/").pop()!;
  expect(orderId).toBeTruthy();

  // ---------------------------------------------------------------------------
  // Step 4: Order Detail - Initial Status & Quote Composer
  // ---------------------------------------------------------------------------
  await expect(page.getByTestId("order-status-badge")).toHaveText(/pending/i);

  // Compose and issue quote
  const quotePriceInput = page.locator("#composer-price");
  await expect(quotePriceInput).toBeVisible();
  await quotePriceInput.fill("850000");

  await page.getByRole("button", { name: /save & issue quote/i }).click();

  // Wait for quote save feedback and status flip to confirmed
  await expect(
    page.getByText(/quoted price saved and quote-ready email sent/i),
  ).toBeVisible(wait);
  await expect(page.getByTestId("order-status-badge")).toHaveText(/confirmed/i);

  // ---------------------------------------------------------------------------
  // Step 5: Record Offline Payment
  // ---------------------------------------------------------------------------
  await page.getByRole("button", { name: /record payment/i }).click();
  await expect(
    page.getByRole("heading", { name: "Record Offline Payment" }),
  ).toBeVisible();

  // Amount is derived server-side (full quote) — only the transaction
  // reference is entered; the read-only amount note shows the quote.
  const txnId = `BKASH-${timestamp}`;
  await page.locator("#record-payment-txnid").fill(txnId);

  // Submit payment form inside dialog
  const recordDialog = page.getByRole("dialog");
  await recordDialog.getByRole("button", { name: "Record Payment" }).click();

  await expect(
    page.getByText(/payment recorded and placed in verification queue/i),
  ).toBeVisible(wait);

  // ---------------------------------------------------------------------------
  // Step 6: Verify Payment in /admin/payments Queue
  // ---------------------------------------------------------------------------
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible(wait);

  // Locate the queue row for this order
  const paymentRow = page.locator("tr").filter({ hasText: orderNo });
  await expect(paymentRow).toBeVisible(wait);
  await expect(paymentRow).toContainText(/8,?50,?000/);

  // Click Verify button on this row
  await paymentRow.getByRole("button", { name: "Verify" }).click();

  // Confirm verification in modal
  await expect(
    page.getByRole("heading", { name: "Verify Payment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm Verification" }).click();

  await expect(
    page.getByText(/payment.*verified successfully/i),
  ).toBeVisible(wait);

  // ---------------------------------------------------------------------------
  // Step 7: Order Detail - Verified Paid Total & Confirmed Status
  // ---------------------------------------------------------------------------
  await page.goto(`/admin/orders/${orderId}`);
  await expect(page.getByText(orderNo).first()).toBeVisible(wait);

  // Status must have automatically flipped to confirmed
  await expect(page.getByTestId("order-status-badge")).toHaveText(/confirmed/i);
  // Paid total must show the verified amount
  await expect(page.getByTestId("paid-total")).toContainText(/8,?50,?000/);

  // ---------------------------------------------------------------------------
  // Step 8: Expenses - Submit & Approve Entry
  // ---------------------------------------------------------------------------
  await page.goto("/admin/expenses");
  await expect(page.getByRole("heading", { level: 1, name: "Expenses" })).toBeVisible(wait);

  // Open Record Expense dialog
  await page.getByRole("button", { name: /record expense/i }).click();
  await expect(
    page.getByRole("heading", { name: "Record New Expense" }),
  ).toBeVisible();

  // Select category
  await page.locator("#expense-category").click();
  await page.getByRole("option", { name: /travel & tickets/i }).click();

  // Fill amount, description, linked order
  await page.locator("#expense-amount").fill("50000");
  const expenseDesc = `Airline tickets for ${orderNo}`;
  await page.locator("#expense-description").fill(expenseDesc);
  await page.locator("#expense-order-id").fill(orderId);

  // Submit expense
  const expenseDialog = page.getByRole("dialog");
  await expenseDialog.getByRole("button", { name: "Submit Expense" }).click();

  await expect(
    page.getByText(/expense entry submitted and pending approval/i),
  ).toBeVisible(wait);

  // Locate the expense in entries table and approve it
  const expenseRow = page.locator("tr").filter({ hasText: expenseDesc });
  await expect(expenseRow).toBeVisible(wait);

  await expenseRow.getByRole("button", { name: "Approve" }).click();
  await expect(
    page.getByText(/expense approved and added to financial p&l records/i),
  ).toBeVisible(wait);

  // ---------------------------------------------------------------------------
  // Step 9: Financial Reports (P&L) - Revenue and Expense Assertion
  // ---------------------------------------------------------------------------
  await page.goto("/admin/expenses/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Expenses" })).toBeVisible(wait);

  // Assert KPI cards
  const revenueDisplay = page.locator('[data-testid="report-revenue"]');
  await expect(revenueDisplay).toBeVisible(wait);
  await expect(revenueDisplay).not.toHaveText("৳0");

  const expenseDisplay = page.locator('[data-testid="report-expenses"]');
  await expect(expenseDisplay).toBeVisible(wait);
  await expect(expenseDisplay).not.toHaveText("৳0");
});
