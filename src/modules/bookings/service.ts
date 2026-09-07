import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { escapeLike, isUniqueViolation, paginate } from "@/lib/db-utils";
import { orderStatusEvents, orders, travelers } from "./schema";
// The order rows carry listing snapshots read from the catalog tables; the
// listing join for the admin list view reads listings directly — the same
// cross-module-table convention modules/leads uses for landing_pages/users.
import { listings } from "@/modules/catalog/schema";
import { users } from "@/modules/users/schema";
import { getListingById } from "@/modules/catalog/service";
import { getLeadDetail, markLeadConverted } from "@/modules/leads/service";
import {
  formatOrderNo,
  isLegalOrderTransition,
  type ConvertLeadOrderInput,
  type InquiryOrderInput,
  type OrderSource,
  type OrderStatus,
  type OrderType,
  type PackageOrderInput,
} from "./validation";

// All DB queries for the bookings (orders) module. Server-only — importing it
// into a client bundle fails the build. Conventions mirror modules/leads +
// modules/catalog service.ts:
//   - order numbers are allocated as max-for-year + 1 with a bounded
//     unique-violation retry (the order_no unique constraint is the DB's last
//     word on races the read missed),
//   - every order write lands with its order_status_events row in ONE
//     transaction (no order-without-timeline, no retry-duplicates),
//   - jsonb cells (customer_snapshot / listing_snapshot) are free-form at rest;
//     every read is projected defensively into the documented shapes below,
//   - NO updateTag here — cache expiry belongs to the guarded actions layer.
//
// There is deliberately NO UI in this module: the admin board/list/detail and
// the customer portal are separate frontend surfaces that consume the exports
// here (and the guarded actions in actions.ts). Reads are exported plainly for
// admin/portal server components (they carry their own route-level guards);
// every write path that reaches a browser goes through the guarded actions.

// ---- public types --------------------------------------------------------------

export type Paginated<T> = { items: T[]; total: number };

/** The frozen listing facts an order keeps forever (price at booking time). */
export type ListingSnapshotView = {
  title: string;
  slug: string;
  price: number | null;
  currency: string;
  durationDays: number | null;
};

/** The projected customer_snapshot cell (covers both order types). */
export type OrderCustomerView = {
  name: string;
  email: string | null;
  phone: string | null;
  /** inquiry orders only — the free-text "what do you need" answer. */
  details: string | null;
  /** inquiry orders only — the cleaned formConfig-driven answers. */
  extraFields: Record<string, string> | null;
};

export type OrderListItem = {
  id: string;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  source: OrderSource;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  /** Title of the ordered listing at list-render time (orders with no listing
   *  — general inquiries — have none; the frozen title lives in the snapshot). */
  listingTitle: string | null;
  /** Display name of the linked customer account (null = guest order). */
  userName: string | null;
  quotedPrice: number | null;
  currency: string;
  createdAt: Date;
};

export type OrderStatusEventView = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  actorId: string | null;
  /** Display name of the acting user, resolved for the timeline. */
  actorName: string | null;
  createdAt: Date;
};

export type TravelerView = {
  id: string;
  name: string;
  passportNo: string | null;
  dob: string | null;
  relation: string | null;
};

export type OrderDetail = {
  id: string;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  source: OrderSource;
  customer: OrderCustomerView;
  listingId: string | null;
  listingSnapshot: ListingSnapshotView | null;
  specialRequests: string | null;
  quotedPrice: number | null;
  finalPrice: number | null;
  currency: string;
  leadId: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** The audit timeline, oldest → newest. */
  events: OrderStatusEventView[];
  /** The frozen traveler manifest. (Batch-inserted travelers share one
   *  transaction timestamp, so this is NOT guaranteed to be the submission
   *  order — the set, not the sequence, is what the order freezes.) */
  travelers: TravelerView[];
};

export type OrderBoardCounts = Record<OrderStatus, number> & { total: number };

export type OrderListQuery = {
  status?: OrderStatus;
  /** Free-text search across order number / customer name / customer phone. */
  search?: string;
  page?: number;
  perPage?: number;
};

/** What a create returns — enough for the caller to tag caches, fire CAPI
 *  (value/currency) and route the customer to their order. */
export type CreatedOrderRef = {
  id: string;
  orderNo: string;
  currency: string;
  /** Listing price at freeze time (package orders); null for inquiries. */
  price: number | null;
};

export type CreateOrderOptions = {
  /** Customer account to link (public submits: the session user when signed in). */
  userId?: string | null;
  /** Acting operator recorded on the created event + created_by (admin paths). */
  actorId?: string | null;
  /** Defaults to "website"; lead conversion passes "lead_conversion". */
  source?: OrderSource;
  /** The lead this order was converted from (source lead_conversion). */
  leadId?: string | null;
  /** Lead conversion (admin surface) may book draft listings; the public
   *  surface always requires published. */
  allowUnpublishedListing?: boolean;
};

// ---- errors --------------------------------------------------------------------

export class OrderError extends Error {
  constructor(
    public code:
      | "NOT_FOUND"
      | "ILLEGAL_TRANSITION"
      | "ALREADY_CONVERTED"
      | "ORDER_NO_CONFLICT"
      | "INVALID_PRICE",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

// ---- row helpers ----------------------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asStringMap(value: unknown): Record<string, string> | null {
  const obj = asObject(value);
  if (!obj) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Project a customer_snapshot cell (either order type) defensively. */
function projectCustomer(value: unknown): OrderCustomerView {
  const obj = asObject(value) ?? {};
  const str = (key: string): string | null =>
    typeof obj[key] === "string" && (obj[key] as string) !== "" ? (obj[key] as string) : null;
  return {
    name: typeof obj.name === "string" ? obj.name : "",
    email: str("email"),
    phone: str("phone"),
    details: str("details"),
    extraFields: asStringMap(obj.extraFields),
  };
}

/** Project a listing_snapshot cell defensively (numbers survive a jsonb round
 *  trip; anything unexpected reads back as null rather than throwing). */
function projectListingSnapshot(value: unknown): ListingSnapshotView | null {
  const obj = asObject(value);
  if (!obj) return null;
  return {
    title: typeof obj.title === "string" ? obj.title : "",
    slug: typeof obj.slug === "string" ? obj.slug : "",
    price: typeof obj.price === "number" ? obj.price : null,
    currency: typeof obj.currency === "string" ? obj.currency : "BDT",
    durationDays: typeof obj.durationDays === "number" ? obj.durationDays : null,
  };
}

/** Search hits the order number OR the customer name/phone projected out of
 *  the customer_snapshot jsonb cell. */
function orderSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(
    ilike(orders.orderNo, pattern),
    sql`(${orders.customerSnapshot} ->> 'name') ilike ${pattern}`,
    sql`(${orders.customerSnapshot} ->> 'phone') ilike ${pattern}`,
  ) as SQL;
}

// ---- order number allocation -----------------------------------------------------

/** Retry budget for order_no unique collisions (concurrent creators that read
 *  the same max-for-year). 5 attempts covers any realistic race. */
const ORDER_NO_INSERT_ATTEMPTS = 5;

/**
 * The NEXT order number for the current year: max stored sequence + 1, read
 * from the orders table. This is an advisory read — under concurrency two
 * callers can draw the same number; the order_no unique constraint catches
 * that and the create paths retry with a fresh draw (≤ 5 attempts).
 */
export async function generateOrderNo(): Promise<string> {
  const year = new Date().getFullYear();
  // Every row matching the LIKE prefix starts "TM-<year>-" (8 chars), so
  // substring(... from 9) is the sequence suffix; strip any non-digits
  // defensively, map '' → null (ignored by max), and compare numerically.
  const [row] = await db
    .select({
      maxSeq: sql<
        number | null
      >`max(cast(nullif(regexp_replace(substring(${orders.orderNo} from 9), '\\D', '', 'g'), '') as int))`,
    })
    .from(orders)
    .where(like(orders.orderNo, `TM-${year}-%`));
  return formatOrderNo(year, (row?.maxSeq ?? 0) + 1);
}

type OrderInsert = typeof orders.$inferInsert;

/**
 * Insert an order + its follow-up rows (travelers, created event) atomically,
 * retrying the WHOLE transaction when the order_no draw collides with a
 * concurrent creator (unique violation). Anything else re-throws untouched.
 */
async function insertOrderWithEvents(
  build: (orderNo: string) => OrderInsert,
  afterOrderInsert: (tx: Pick<typeof db, "insert">, orderId: string) => Promise<void>,
): Promise<{ id: string; orderNo: string }> {
  for (let attempt = 0; attempt < ORDER_NO_INSERT_ATTEMPTS; attempt++) {
    const orderNo = await generateOrderNo();
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(orders)
          .values(build(orderNo))
          .returning({ id: orders.id, orderNo: orders.orderNo });
        await afterOrderInsert(tx, row.id);
        return { id: row.id, orderNo: row.orderNo };
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // order_no collision — re-draw and retry the whole transaction.
    }
  }
  throw new OrderError(
    "ORDER_NO_CONFLICT",
    "Could not allocate an order number — please retry.",
  );
}

/**
 * Event insert bound to a db or transaction handle. Typed to only what it
 * uses (`.insert`) so both the module `db` and a `db.transaction` callback's
 * `tx` satisfy it. Called on the SAME handle as its order write so an event
 * that throws rolls the write back with it.
 */
async function addOrderEventOn(
  exec: Pick<typeof db, "insert">,
  orderId: string,
  input: {
    fromStatus?: OrderStatus | null;
    toStatus: OrderStatus;
    note?: string | null;
    actorId?: string | null;
  },
): Promise<void> {
  const write: typeof orderStatusEvents.$inferInsert = {
    orderId,
    toStatus: input.toStatus,
  };
  if (input.fromStatus) write.fromStatus = input.fromStatus;
  if (input.note) write.note = input.note;
  if (input.actorId) write.actorId = input.actorId;
  await exec.insert(orderStatusEvents).values(write);
}

// ---- reads -----------------------------------------------------------------------

const orderListCols = {
  id: orders.id,
  orderNo: orders.orderNo,
  type: orders.type,
  status: orders.status,
  source: orders.source,
  customerSnapshot: orders.customerSnapshot,
  quotedPrice: orders.quotedPrice,
  currency: orders.currency,
  createdAt: orders.createdAt,
  listingTitle: listings.title,
  userName: users.name,
} as const;

type OrderListRow = {
  id: string;
  orderNo: string;
  type: OrderType;
  status: OrderStatus;
  source: OrderSource;
  customerSnapshot: unknown;
  quotedPrice: string | null;
  currency: string;
  createdAt: Date;
  listingTitle: string | null;
  userName: string | null;
};

function toOrderListItem(row: OrderListRow): OrderListItem {
  const customer = projectCustomer(row.customerSnapshot);
  return {
    id: row.id,
    orderNo: row.orderNo,
    type: row.type,
    status: row.status,
    source: row.source,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    listingTitle: row.listingTitle,
    userName: row.userName,
    quotedPrice: row.quotedPrice === null ? null : Number(row.quotedPrice),
    currency: row.currency,
    createdAt: row.createdAt,
  };
}

function orderListQuery() {
  return db
    .select(orderListCols)
    .from(orders)
    .leftJoin(listings, eq(orders.listingId, listings.id))
    .leftJoin(users, eq(orders.userId, users.id));
}

/**
 * Admin board/list read: status filter + free-text search (order number,
 * customer name/phone), newest first, joined listing title + linked account
 * name. perPage defaults to 20 and caps at 50 — an EXPLICIT perPage may go up
 * to 200 (board views), the same contract as listLeads.
 */
export async function listOrders(query: OrderListQuery = {}): Promise<Paginated<OrderListItem>> {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(orders.status, query.status));
  const search = query.search?.trim();
  if (search) conditions.push(orderSearchCondition(search));

  const where = and(...conditions);
  const { offset, perPage } = paginate({
    page: query.page,
    perPage: query.perPage,
    defaultPerPage: 20,
    maxPerPage: query.perPage ? 200 : 50,
  });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  const rows = (await orderListQuery()
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(perPage)
    .offset(offset)) as unknown as OrderListRow[];

  return { items: rows.map(toOrderListItem), total: countRow.total };
}

/** The customer portal's own-orders list: ownership-filtered, newest first. */
export async function myOrders(
  userId: string,
  query: { page?: number; perPage?: number } = {},
): Promise<Paginated<OrderListItem>> {
  const where = eq(orders.userId, userId);
  const { offset, perPage } = paginate({ page: query.page, perPage: query.perPage, defaultPerPage: 10 });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  const rows = (await orderListQuery()
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(perPage)
    .offset(offset)) as unknown as OrderListRow[];

  return { items: rows.map(toOrderListItem), total: countRow.total };
}

/** Full order row + timeline + travelers for the admin detail page. null when
 *  the id is unknown. */
export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const [row] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      userId: orders.userId,
      customerSnapshot: orders.customerSnapshot,
      listingId: orders.listingId,
      listingSnapshot: orders.listingSnapshot,
      type: orders.type,
      status: orders.status,
      quotedPrice: orders.quotedPrice,
      finalPrice: orders.finalPrice,
      currency: orders.currency,
      specialRequests: orders.specialRequests,
      source: orders.source,
      leadId: orders.leadId,
      createdBy: orders.createdBy,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      userName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) return null;

  const [events, travelerRows] = await Promise.all([
    db
      .select({
        id: orderStatusEvents.id,
        fromStatus: orderStatusEvents.fromStatus,
        toStatus: orderStatusEvents.toStatus,
        note: orderStatusEvents.note,
        actorId: orderStatusEvents.actorId,
        actorName: users.name,
        createdAt: orderStatusEvents.createdAt,
      })
      .from(orderStatusEvents)
      .leftJoin(users, eq(orderStatusEvents.actorId, users.id))
      .where(eq(orderStatusEvents.orderId, id))
      .orderBy(asc(orderStatusEvents.createdAt), asc(orderStatusEvents.id)),
    db
      .select({
        id: travelers.id,
        name: travelers.name,
        passportNo: travelers.passportNo,
        dob: travelers.dob,
        relation: travelers.relation,
      })
      .from(travelers)
      .where(eq(travelers.orderId, id))
      .orderBy(asc(travelers.createdAt), asc(travelers.id)),
  ]);

  return {
    id: row.id,
    orderNo: row.orderNo,
    type: row.type,
    status: row.status,
    source: row.source,
    customer: projectCustomer(row.customerSnapshot),
    listingId: row.listingId,
    listingSnapshot: projectListingSnapshot(row.listingSnapshot),
    specialRequests: row.specialRequests,
    quotedPrice: row.quotedPrice === null ? null : Number(row.quotedPrice),
    finalPrice: row.finalPrice === null ? null : Number(row.finalPrice),
    currency: row.currency,
    leadId: row.leadId,
    userId: row.userId,
    userName: row.userName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    events: events.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      actorId: event.actorId,
      actorName: event.actorName,
      createdAt: event.createdAt,
    })),
    travelers: travelerRows,
  };
}

/** The customer portal's detail read — ownership-checked (no row, not even a
 *  null-vs-404 distinction, leaks to a non-owner). */
export async function getMyOrderDetail(
  userId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!row) return null;
  return getOrderDetail(orderId);
}

/** Board header counts — one histogram via GROUP BY over the status enum. */
export async function getOrderBoardCounts(): Promise<OrderBoardCounts> {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);

  const counts: OrderBoardCounts = {
    pending: 0,
    in_review: 0,
    quoted: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    total: 0,
  };
  let total = 0;
  for (const row of rows) {
    const status = row.status as OrderStatus;
    if (status in counts) {
      counts[status] = row.count;
      total += row.count;
    }
  }
  counts.total = total;
  return counts;
}

// ---- creates ---------------------------------------------------------------------

/**
 * Resolve the listing an order is being placed against. Public paths require
 * PUBLISHED + not-deleted (getListingById already filters soft-deleted rows);
 * the admin lead-conversion path may book a draft listing but never a deleted
 * one. Unknown or unavailable → typed NOT_FOUND.
 */
async function resolveListing(
  listingId: string,
  opts: { allowUnpublished: boolean },
) {
  const listing = await getListingById(listingId);
  if (!listing || (!opts.allowUnpublished && listing.status !== "published")) {
    throw new OrderError("NOT_FOUND", `Listing ${listingId} is not available.`);
  }
  return listing;
}

function creationNote(source: OrderSource | undefined): string {
  return source === "lead_conversion" ? "Order created from lead conversion" : "Order created";
}

/**
 * Public package booking: freeze the listing snapshot (title/price/currency/
 * durationDays/slug) + the customer snapshot, insert the order (type package,
 * status in_review), its travelers and the created event in ONE transaction.
 * The orderNo draw is retried on unique collisions (≤ 5).
 */
export async function createPackageOrder(
  input: PackageOrderInput,
  opts: CreateOrderOptions = {},
): Promise<CreatedOrderRef> {
  const listing = await resolveListing(input.listingId, {
    allowUnpublished: Boolean(opts.allowUnpublishedListing),
  });

  const created = await insertOrderWithEvents(
    (orderNo) => ({
      orderNo,
      userId: opts.userId ?? null,
      customerSnapshot: {
        name: input.customer.name,
        email: input.customer.email ?? null,
        phone: input.customer.phone,
      },
      listingId: listing.id,
      listingSnapshot: {
        title: listing.title,
        slug: listing.slug,
        price: listing.price,
        currency: listing.currency,
        durationDays: listing.durationDays,
      },
      type: "package" as const,
      status: "in_review" as const,
      currency: listing.currency,
      specialRequests: input.specialRequests ?? null,
      source: opts.source ?? "website",
      leadId: opts.leadId ?? null,
      createdBy: opts.actorId ?? null,
    }),
    async (tx, orderId) => {
      if (input.travelers.length > 0) {
        await tx.insert(travelers).values(
          input.travelers.map((traveler) => ({
            orderId,
            name: traveler.name,
            passportNo: traveler.passportNo ?? null,
            dob: traveler.dob ?? null,
            relation: traveler.relation ?? null,
          })),
        );
      }
      await addOrderEventOn(tx, orderId, {
        toStatus: "in_review",
        note: creationNote(opts.source),
        actorId: opts.actorId ?? null,
      });
    },
  );

  return {
    id: created.id,
    orderNo: created.orderNo,
    currency: listing.currency,
    price: listing.price,
  };
}

/**
 * Public inquiry: type inquiry, status pending, listing optional (a general
 * inquiry carries no listing). The full inquiry payload — contact, details and
 * the (already-cleaned) formConfig extras — is frozen into customer_snapshot.
 */
export async function createInquiryOrder(
  input: InquiryOrderInput,
  opts: CreateOrderOptions = {},
): Promise<CreatedOrderRef> {
  const listing = input.listingId
    ? await resolveListing(input.listingId, {
        allowUnpublished: Boolean(opts.allowUnpublishedListing),
      })
    : null;

  const extraFields =
    input.extraFields && Object.keys(input.extraFields).length > 0 ? input.extraFields : null;
  const currency = listing?.currency ?? "BDT";

  const created = await insertOrderWithEvents(
    (orderNo) => ({
      orderNo,
      userId: opts.userId ?? null,
      customerSnapshot: {
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        details: input.details ?? null,
        extraFields,
      },
      listingId: listing?.id ?? null,
      listingSnapshot: listing
        ? {
            title: listing.title,
            slug: listing.slug,
            price: listing.price,
            currency: listing.currency,
            durationDays: listing.durationDays,
          }
        : null,
      type: "inquiry" as const,
      status: "pending" as const,
      currency,
      source: opts.source ?? "website",
      leadId: opts.leadId ?? null,
      createdBy: opts.actorId ?? null,
    }),
    async (tx, orderId) => {
      await addOrderEventOn(tx, orderId, {
        toStatus: "pending",
        note: creationNote(opts.source),
        actorId: opts.actorId ?? null,
      });
    },
  );

  return { id: created.id, orderNo: created.orderNo, currency, price: null };
}

// ---- status machine ----------------------------------------------------------------

/**
 * Move an order across the pipeline. The transition must be legal per
 * ORDER_STATUS_TRANSITIONS (same-status calls are idempotent no-ops). The
 * status write and its audit event commit atomically.
 */
export async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<OrderDetail> {
  const current = await getOrderDetail(orderId);
  if (!current) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
  if (current.status === toStatus) return current;
  if (!isLegalOrderTransition(current.status, toStatus)) {
    throw new OrderError(
      "ILLEGAL_TRANSITION",
      `An order cannot move from ${current.status} to ${toStatus}.`,
    );
  }

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });
    if (!row) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
    await addOrderEventOn(tx, orderId, {
      fromStatus: current.status,
      toStatus,
      note: opts.note ?? null,
      actorId: opts.actorId ?? null,
    });
  });

  const detail = await getOrderDetail(orderId);
  if (!detail) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
  return detail;
}

/**
 * Set the quoted price — the only write that moves an order to "quoted"
 * (legal from pending/in_review only). The price lands with two decimals; the
 * audit event defaults its note to the quoted amount + currency so the
 * timeline always shows what was quoted.
 */
export async function setQuote(
  orderId: string,
  quotedPrice: number,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<OrderDetail> {
  // numeric(14,2) tops out at 12 integer digits; reject beyond that (and any
  // non-finite value) before Postgres does.
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0 || quotedPrice >= 1e12) {
    throw new OrderError("INVALID_PRICE", "Quoted price must be a positive amount.");
  }
  const current = await getOrderDetail(orderId);
  if (!current) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
  if (current.status !== "pending" && current.status !== "in_review") {
    throw new OrderError(
      "ILLEGAL_TRANSITION",
      `A quote can only be set while an order is pending or in review (current: ${current.status}).`,
    );
  }

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "quoted", quotedPrice: quotedPrice.toFixed(2), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });
    if (!row) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
    await addOrderEventOn(tx, orderId, {
      fromStatus: current.status,
      toStatus: "quoted",
      note: opts.note ?? `Quoted at ${quotedPrice.toFixed(2)} ${current.currency}`,
      actorId: opts.actorId ?? null,
    });
  });

  const detail = await getOrderDetail(orderId);
  if (!detail) throw new OrderError("NOT_FOUND", `Order ${orderId} not found.`);
  return detail;
}

/** Thin named wrappers over transitionOrder for the three funnel exits. */
export async function confirmOrder(
  orderId: string,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<OrderDetail> {
  return transitionOrder(orderId, "confirmed", opts);
}

export async function completeOrder(
  orderId: string,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<OrderDetail> {
  return transitionOrder(orderId, "completed", opts);
}

export async function cancelOrder(
  orderId: string,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<OrderDetail> {
  return transitionOrder(orderId, "cancelled", opts);
}

// ---- lead conversion ----------------------------------------------------------------

/**
 * Convert a lead into an order: create the order (source lead_conversion,
 * leadId linked — the admin may book a draft listing), then mark the lead
 * converted with the new order id wired in (leads.convertedOrderId + the
 * "converted" audit event, both owned by the leads service — imported here,
 * never from its actions).
 *
 * The lead-side write deliberately runs AFTER the order insert, in its own
 * transaction: if it fails the order still exists (linked via leadId) and the
 * admin retries the conversion, which the ALREADY_CONVERTED guard below makes
 * safe. The narrow concurrent double-conversion race leaves the second order
 * linked to the lead while the lead points at the first — visible in the UI,
 * not silent data loss.
 */
export async function convertLeadToOrder(
  leadId: string,
  input: ConvertLeadOrderInput,
  opts: { actorId?: string | null } = {},
): Promise<OrderDetail> {
  const lead = await getLeadDetail(leadId);
  if (!lead) throw new OrderError("NOT_FOUND", `Lead ${leadId} not found.`);
  if (lead.status === "converted" || lead.convertedOrderId) {
    throw new OrderError("ALREADY_CONVERTED", "This lead has already been converted to an order.");
  }

  const createOpts: CreateOrderOptions = {
    source: "lead_conversion",
    leadId,
    actorId: opts.actorId ?? null,
    userId: null,
    allowUnpublishedListing: true,
  };
  const created =
    input.type === "package"
      ? await createPackageOrder(input, createOpts)
      : await createInquiryOrder(input, createOpts);

  await markLeadConverted(leadId, {
    actorId: opts.actorId ?? null,
    convertedOrderId: created.id,
  });

  const detail = await getOrderDetail(created.id);
  if (!detail) throw new OrderError("NOT_FOUND", `Order ${created.id} not found.`);
  return detail;
}
