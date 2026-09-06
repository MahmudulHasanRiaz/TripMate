import { afterEach, describe, expect, it, vi } from "vitest";
import "dotenv/config";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1 — same pattern as tests/leads-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the bookings service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as the other
// module integration suites.
//
// The guarded actions (withGuard + rate limit + CAPI) are NOT callable under
// vitest's node env (getSession needs Next request state), so the tests
// exercise the service layer they are built from — create → quote → confirm →
// complete, inquiry, board/list reads, ownership reads and lead conversion —
// the exact happy paths the actions wrap.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("bookings service (integration — Postgres)", () => {
  // Unique-per-run marker so parallel/leftover rows can never be picked up by
  // another run or a failed previous run.
  const marker = `it-ord-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const year = new Date().getFullYear();
  const emails = {
    owner: `owner-${marker}@test.local`,
    stranger: `stranger-${marker}@test.local`,
    lead: `lead-${marker}@test.local`,
  };
  const slugs = {
    published: `it-ord-published-${marker}`,
    draft: `it-ord-draft-${marker}`,
    category: `it-ord-cat-${marker}`,
  };

  /** Rows created by this run, for precise FK-safe cleanup. */
  const orderIds: string[] = [];
  const leadIds: string[] = [];

  const purge = async () => {
    const { db } = await import("@/db/client");
    const { orders, orderStatusEvents, travelers } = await import("@/modules/bookings/schema");
    const { leads, leadEvents } = await import("@/modules/leads/schema");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { users } = await import("@/modules/users/schema");
    const { eq, inArray } = await import("drizzle-orm");

    // Orders linked to this run's leads (covers an order whose id escaped
    // tracking because a later step threw) plus every tracked id.
    const leadRows = leadIds.length
      ? await db.select({ id: orders.id }).from(orders).where(inArray(orders.leadId, leadIds))
      : [];
    const ids = [...new Set([...orderIds, ...leadRows.map((r) => r.id)])];
    if (ids.length > 0) {
      await db.delete(orderStatusEvents).where(inArray(orderStatusEvents.orderId, ids));
      await db.delete(travelers).where(inArray(travelers.orderId, ids));
      await db.delete(orders).where(inArray(orders.id, ids));
    }
    if (leadIds.length > 0) {
      await db.delete(leadEvents).where(inArray(leadEvents.leadId, leadIds));
      await db.delete(leads).where(inArray(leads.id, leadIds));
    }
    await db.delete(listings).where(inArray(listings.slug, [slugs.published, slugs.draft]));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, slugs.category));
    await db
      .delete(users)
      .where(inArray(users.email, [emails.owner, emails.stranger, emails.lead]));
  };
  afterEach(async () => {
    // Best-effort: a failed cleanup must not fail a passing test nor strand a
    // row for the next test. Pre-run purge keeps the suites independent.
    await purge().catch(() => {});
  });

  /** A published + a draft listing under one category. */
  const createListings = async () => {
    const { db } = await import("@/db/client");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(listings).where(eq(listings.slug, slugs.published));
    await db.delete(listings).where(eq(listings.slug, slugs.draft));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, slugs.category));

    const [category] = await db
      .insert(serviceCategories)
      .values({ name: `Orders ${marker}`, slug: slugs.category, kind: "package" })
      .returning({ id: serviceCategories.id });
    const [published] = await db
      .insert(listings)
      .values({
        categoryId: category.id,
        title: `Published Package ${marker}`,
        slug: slugs.published,
        price: "1200.00",
        currency: "BDT",
        durationDays: 5,
        status: "published",
      })
      .returning({ id: listings.id });
    const [draft] = await db
      .insert(listings)
      .values({
        categoryId: category.id,
        title: `Draft Package ${marker}`,
        slug: slugs.draft,
        price: "800.00",
        currency: "BDT",
        status: "draft",
      })
      .returning({ id: listings.id });
    return { publishedId: published.id, draftId: draft.id };
  };

  const createUser = async (email: string, name: string) => {
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");
    const [row] = await db
      .insert(users)
      .values({ email, role: "customer", name, status: "active" })
      .returning({ id: users.id });
    return row.id;
  };

  const createLead = async () => {
    const { db } = await import("@/db/client");
    const { leads } = await import("@/modules/leads/schema");
    const [row] = await db
      .insert(leads)
      .values({
        source: "manual",
        name: `Lead ${marker}`,
        email: emails.lead,
        phone: "+8801712345678",
        message: "Wants the 5-day package",
      })
      .returning({ id: leads.id });
    leadIds.push(row.id);
    return row.id;
  };

  const packageInput = (listingId: string) => ({
    listingId,
    customer: { name: `Customer ${marker}`, email: emails.owner, phone: "+8801712345678" },
    travelers: [
      { name: `Customer ${marker}`, passportNo: "BX0123456" },
      { name: `Spouse ${marker}`, dob: "1992-11-30", relation: "spouse" },
    ],
    specialRequests: "Vegetarian meals",
  });

  const track = <T extends { id: string }>(ref: T): T => {
    orderIds.push(ref.id);
    return ref;
  };

  it("package order: create → quote → confirm → complete with a full ascending timeline", async () => {
    const service = await import("@/modules/bookings/service");
    const { ORDER_NO_REGEX } = await import("@/modules/bookings/validation");
    const { publishedId: listingId } = await createListings();
    const userId = await createUser(emails.owner, `Owner ${marker}`);

    const created = track(
      await service.createPackageOrder(packageInput(listingId), { userId }),
    );
    expect(created.orderNo).toMatch(ORDER_NO_REGEX);
    expect(created.orderNo.startsWith(`TM-${year}-`)).toBe(true);
    expect(created.price).toBe(1200);
    expect(created.currency).toBe("BDT");

    let detail = await service.getOrderDetail(created.id);
    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({
      id: created.id,
      orderNo: created.orderNo,
      type: "package",
      status: "in_review",
      source: "website",
      userId,
      userName: `Owner ${marker}`,
      specialRequests: "Vegetarian meals",
      currency: "BDT",
    });
    expect(detail?.customer).toMatchObject({
      name: `Customer ${marker}`,
      email: emails.owner,
      phone: "+8801712345678",
    });
    expect(detail?.listingSnapshot).toMatchObject({
      title: `Published Package ${marker}`,
      slug: slugs.published,
      price: 1200,
      currency: "BDT",
      durationDays: 5,
    });
    expect(detail?.travelers).toHaveLength(2);
    // Insertion order is not guaranteed (batch insert shares one timestamp) —
    // assert on the set, not the sequence.
    const spouse = detail?.travelers.find((t) => t.name === `Spouse ${marker}`);
    expect(spouse).toMatchObject({ dob: "1992-11-30", relation: "spouse" });
    expect(detail?.travelers.some((t) => t.passportNo === "BX0123456")).toBe(true);
    // The created event: fromStatus null → in_review, no actor.
    expect(detail?.events).toHaveLength(1);
    expect(detail?.events[0]).toMatchObject({ fromStatus: null, toStatus: "in_review" });
    expect(detail?.events[0].actorId).toBeNull();

    // Quote from in_review, then confirm, then complete.
    detail = await service.setQuote(created.id, 1500);
    expect(detail?.status).toBe("quoted");
    expect(detail?.quotedPrice).toBe(1500);
    detail = await service.confirmOrder(created.id, { actorId: userId });
    expect(detail?.status).toBe("confirmed");
    detail = await service.completeOrder(created.id, { actorId: userId });
    expect(detail?.status).toBe("completed");

    // Timeline: created → quoted → confirmed → completed, oldest first.
    const timeline = detail?.events.map((e) => [e.fromStatus, e.toStatus]);
    expect(timeline).toEqual([
      [null, "in_review"],
      ["in_review", "quoted"],
      ["quoted", "confirmed"],
      ["confirmed", "completed"],
    ]);
    expect(detail?.events[1].note).toBe("Quoted at 1500.00 BDT");
    expect(detail?.events[2].actorId).toBe(userId);

    // Terminal statuses have no outgoing edges.
    await expect(service.cancelOrder(created.id)).rejects.toMatchObject({
      code: "ILLEGAL_TRANSITION",
    });
    // And confirmed → quoted was never legal (complete only from confirmed).
    const confirmed2 = track(await service.createPackageOrder(packageInput(listingId), {}));
    await service.setQuote(confirmed2.id, 99);
    await service.confirmOrder(confirmed2.id);
    await expect(service.transitionOrder(confirmed2.id, "quoted")).rejects.toMatchObject({
      code: "ILLEGAL_TRANSITION",
    });
  });

  it("allocates sequential order numbers within the year", async () => {
    const service = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const first = track(await service.createPackageOrder(packageInput(listingId), {}));
    const second = track(await service.createPackageOrder(packageInput(listingId), {}));
    const seq = (orderNo: string) => Number(orderNo.slice(`TM-${year}-`.length));
    expect(first.orderNo.startsWith(`TM-${year}-`)).toBe(true);
    expect(second.orderNo.startsWith(`TM-${year}-`)).toBe(true);
    expect(seq(second.orderNo)).toBe(seq(first.orderNo) + 1);
  });

  it("inquiry order: pending + optional listing snapshot; quotable straight from pending", async () => {
    const service = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const created = track(
      await service.createInquiryOrder({
        listingId,
        name: `Inquirer ${marker}`,
        phone: "+8801812345678",
        email: emails.owner,
        details: "Need a visa consultation for Japan",
        extraFields: { destination: "Japan" },
      }),
    );
    expect(created.price).toBeNull();

    const detail = await service.getOrderDetail(created.id);
    expect(detail).toMatchObject({ type: "inquiry", status: "pending", source: "website" });
    expect(detail?.listingSnapshot?.title).toBe(`Published Package ${marker}`);
    expect(detail?.customer).toMatchObject({
      name: `Inquirer ${marker}`,
      phone: "+8801812345678",
      details: "Need a visa consultation for Japan",
    });
    expect(detail?.customer.extraFields).toEqual({ destination: "Japan" });
    expect(detail?.travelers).toEqual([]);
    expect(detail?.events[0]).toMatchObject({ fromStatus: null, toStatus: "pending" });

    const quoted = await service.setQuote(created.id, 450);
    expect(quoted.status).toBe("quoted");

    // A general inquiry (no listing) carries no snapshot and defaults to BDT.
    const general = track(
      await service.createInquiryOrder({ name: `General ${marker}`, phone: "01712345678" }),
    );
    const generalDetail = await service.getOrderDetail(general.id);
    expect(generalDetail?.listingId).toBeNull();
    expect(generalDetail?.listingSnapshot).toBeNull();
    expect(generalDetail?.currency).toBe("BDT");
  });

  it("refuses unpublished or deleted listings on the public create path", async () => {
    const service = await import("@/modules/bookings/service");
    const { db } = await import("@/db/client");
    const { listings } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    const { draftId, publishedId } = await createListings();

    await expect(service.createPackageOrder(packageInput(draftId), {})).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await db
      .update(listings)
      .set({ deletedAt: new Date() })
      .where(eq(listings.id, publishedId));
    await expect(service.createPackageOrder(packageInput(publishedId), {})).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("list / board / my-orders reads see the created orders (ownership-checked)", async () => {
    const service = await import("@/modules/bookings/service");
    const { publishedId: listingId } = await createListings();
    const ownerId = await createUser(emails.owner, `Owner ${marker}`);
    const strangerId = await createUser(emails.stranger, `Stranger ${marker}`);
    const created = track(
      await service.createPackageOrder(packageInput(listingId), { userId: ownerId }),
    );

    const byOrderNo = await service.listOrders({ search: created.orderNo });
    expect(byOrderNo.total).toBeGreaterThanOrEqual(1);
    const mine = byOrderNo.items.find((o) => o.id === created.id);
    expect(mine).toMatchObject({
      orderNo: created.orderNo,
      status: "in_review",
      customerName: `Customer ${marker}`,
      customerPhone: "+8801712345678",
      listingTitle: `Published Package ${marker}`,
      userName: `Owner ${marker}`,
    });

    const byCustomer = await service.listOrders({ search: `Customer ${marker}` });
    expect(byCustomer.items.some((o) => o.id === created.id)).toBe(true);

    const board = await service.getOrderBoardCounts();
    expect(board.in_review).toBeGreaterThanOrEqual(1);
    expect(board.total).toBeGreaterThanOrEqual(1);

    const portal = await service.myOrders(ownerId);
    expect(portal.items.some((o) => o.id === created.id)).toBe(true);
    expect(await service.myOrders(strangerId)).toMatchObject({ items: [], total: 0 });

    const owned = await service.getMyOrderDetail(ownerId, created.id);
    expect(owned?.id).toBe(created.id);
    expect(await service.getMyOrderDetail(strangerId, created.id)).toBeNull();
    expect(await service.getOrderDetail("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("convertLeadToOrder creates a lead_conversion order and wires the lead to it", async () => {
    const service = await import("@/modules/bookings/service");
    const leadsService = await import("@/modules/leads/service");
    const { db } = await import("@/db/client");
    const { leadEvents } = await import("@/modules/leads/schema");
    const { asc, eq } = await import("drizzle-orm");
    const { draftId } = await createListings();
    const leadId = await createLead();
    const staffId = await createUser(emails.owner, `Staff ${marker}`);

    // Lead conversion may book a DRAFT listing (operator path) — the order
    // still freezes its snapshot.
    const order = await service.convertLeadToOrder(
      leadId,
      {
        type: "package",
        listingId: draftId,
        customer: { name: `Lead ${marker}`, phone: "+8801712345678", email: emails.lead },
        travelers: [{ name: `Lead ${marker}` }],
      },
      { actorId: staffId },
    );
    orderIds.push(order.id);

    expect(order).toMatchObject({
      type: "package",
      status: "in_review",
      source: "lead_conversion",
      leadId,
      listingSnapshot: { title: `Draft Package ${marker}`, price: 800 },
    });
    expect(order.events[0]).toMatchObject({
      fromStatus: null,
      toStatus: "in_review",
      actorId: staffId,
    });

    const lead = await leadsService.getLeadDetail(leadId);
    expect(lead?.status).toBe("converted");
    expect(lead?.convertedOrderId).toBe(order.id);
    const convertedEvents = await db
      .select({ type: leadEvents.type, payload: leadEvents.payload })
      .from(leadEvents)
      .where(eq(leadEvents.leadId, leadId))
      .orderBy(asc(leadEvents.createdAt), asc(leadEvents.id));
    expect(
      convertedEvents.some(
        (row) =>
          row.type === "converted" &&
          (row.payload as { convertedOrderId?: string | null } | null)?.convertedOrderId ===
            order.id,
      ),
    ).toBe(true);

    // A second conversion of the same lead is refused.
    await expect(
      service.convertLeadToOrder(leadId, {
        type: "inquiry",
        name: `Lead ${marker}`,
        phone: "+8801712345678",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_CONVERTED" });
  });
});
