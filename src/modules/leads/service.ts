import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { escapeLike, paginate } from "@/lib/db-utils";
// landing_pages is co-located with the leads schema (the leads FK points at it
// and both ship together) — this module's service consumes that table directly.
import { landingPages, leadEvents, leads } from "./schema";
import { users } from "@/modules/users/schema";
import type { LandingFormField } from "@/modules/landing-pages/section-types";
import type { LeadSource, LeadStatus } from "./validation";

// All DB queries for the leads module (the core of the lead business). This is
// the module that owns the funnel the landing-page builder and the admin lead
// workspace both feed. Server-only — importing it into a client bundle fails
// the build. Conventions mirror modules/catalog + modules/content service.ts:
//   - search input is LIKE-escaped so it is matched literally,
//   - jsonb cells (form_data / lead_events.payload) are free-form at rest; every
//     read is projected defensively into the documented shapes below,
//   - writes go through the schema's $inferInsert shape and never fight the
//     guarantees the DB already makes (default status/source, uuid ids).
//
// There is deliberately NO UI in this module: the admin kanban/list/detail are a
// separate frontend surface that consumes the exports here (and the guarded
// actions in actions.ts). Reads are exported plainly so admin server components
// can call them directly (they carry their own route-level guard); every WRITE
// path that reaches a browser goes through the guarded actions instead.

// ---- public types ------------------------------------------------------------

export type Paginated<T> = { items: T[]; total: number };

export type LeadListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  /** Landing page title when the lead came through a published /l/<slug> form. */
  landingTitle: string | null;
  status: LeadStatus;
  /** Display name of the current assignee (null = unassigned). */
  assignedToName: string | null;
  score: number | null;
  createdAt: Date;
  source: LeadSource;
};

export type LeadEventView = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  actorId: string | null;
  /** Display name of the acting user, resolved for the timeline. */
  actorName: string | null;
  createdAt: Date;
};

export type LeadDetail = {
  id: string;
  landingPageId: string | null;
  source: LeadSource;
  name: string;
  email: string | null;
  phone: string;
  message: string | null;
  /** The raw submitted form payload (the field the visitor actually filled). */
  formData: Record<string, string> | null;
  status: LeadStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  convertedOrderId: string | null;
  score: number | null;
  notes: string | null;
  followUpCount: number;
  nextFollowUpAt: Date | null;
  landingTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** The audit timeline, oldest → newest. */
  events: LeadEventView[];
};

export type LeadBoardCounts = Record<LeadStatus, number> & { total: number };

export type LeadListQuery = {
  status?: LeadStatus;
  /** A user id, or the sentinel "unassigned" for the empty-assignee column. */
  assignedTo?: string;
  /** Free-text search across name / phone / email. */
  search?: string;
  page?: number;
  perPage?: number;
  sort?: "newest" | "oldest";
};

// ---- errors ------------------------------------------------------------------

export class LeadError extends Error {
  constructor(
    public code: "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "LeadError";
  }
}

// ---- column projection + search helpers --------------------------------------

const STAFF_ROLES = ["superadmin", "admin", "staff"] as const;

function leadSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(
    ilike(leads.name, pattern),
    ilike(leads.phone, pattern),
    ilike(leads.email, pattern),
  ) as SQL;
}

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
  return out;
}

/**
 * Project a validated lead-form submission onto the leads row's structured
 * columns. Landing forms are fully configurable, so the canonical columns
 * (name/email/phone/message) are best-effort: they are read from well-known
 * reserved keys when the author used them, then email/phone fall back to the
 * first submitted email-/tel-typed field (buildLeadSchema guarantees every
 * configured email/tel field holds a value, so those two are always derivable
 * when a field of that type exists). Every submitted value is retained verbatim
 * in `form_data` regardless — the structured columns are convenience denormal-
 * izations for the board/list/search, never the source of truth.
 *
 * The DB's `leads.phone` is NOT NULL, so a form with no tel field at all (an
 * email-only form — valid under buildLeadSchema's reachability rule) yields an
 * empty-string phone rather than a raw NOT NULL violation; the empty value is
 * treated as "no phone" by every reader.
 */
export function deriveLeadContact(
  formData: Record<string, string>,
  fields: LandingFormField[],
): {
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
} {
  const firstNonEmpty = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = formData[key]?.trim();
      if (value) return value;
    }
    return null;
  };

  let email = firstNonEmpty("email", "email_address");
  if (!email) {
    const field = fields.find((f) => f.type === "email");
    const value = field ? formData[field.key]?.trim() : "";
    if (value) email = value;
  }

  let phone = firstNonEmpty("phone", "tel", "mobile", "phone_number");
  if (!phone) {
    const field = fields.find((f) => f.type === "tel");
    const value = field ? formData[field.key]?.trim() : "";
    if (value) phone = value;
  }

  return {
    name: firstNonEmpty("name", "full_name", "fullname") ?? "",
    email,
    phone,
    message: firstNonEmpty("message", "notes", "comments"),
  };
}

// ---- reads -------------------------------------------------------------------

const listCols = {
  id: leads.id,
  name: leads.name,
  phone: leads.phone,
  email: leads.email,
  status: leads.status,
  score: leads.score,
  createdAt: leads.createdAt,
  source: leads.source,
  landingTitle: landingPages.title,
  assignedToName: users.name,
} as const;

export async function listLeads(query: LeadListQuery = {}): Promise<Paginated<LeadListItem>> {
  const conditions: SQL[] = [];

  if (query.status) conditions.push(eq(leads.status, query.status));
  if (query.assignedTo === "unassigned") {
    conditions.push(isNull(leads.assignedTo));
  } else if (query.assignedTo) {
    conditions.push(eq(leads.assignedTo, query.assignedTo));
  }
  const search = query.search?.trim();
  if (search) conditions.push(leadSearchCondition(search));

  const where = and(...conditions);
  const { offset, perPage } = paginate({
    page: query.page,
    perPage: query.perPage,
    defaultPerPage: 20,
    maxPerPage: query.perPage ? 200 : 50,
  });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(leads)
    .leftJoin(landingPages, eq(leads.landingPageId, landingPages.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(where);

  const rows = await db
    .select(listCols)
    .from(leads)
    .leftJoin(landingPages, eq(leads.landingPageId, landingPages.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(where)
    .orderBy(
      query.sort === "oldest" ? asc(leads.createdAt) : desc(leads.createdAt),
      desc(leads.id),
    )
    .limit(perPage)
    .offset(offset);

  const items: LeadListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    landingTitle: row.landingTitle,
    status: row.status as LeadStatus,
    assignedToName: row.assignedToName,
    score: row.score,
    createdAt: row.createdAt,
    source: row.source as LeadSource,
  }));

  return { items, total: countRow.total };
}

/** Full lead row + timeline for the detail page. null when the id is unknown. */
export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const [row] = await db
    .select({
      id: leads.id,
      landingPageId: leads.landingPageId,
      source: leads.source,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      message: leads.message,
      formData: leads.formData,
      status: leads.status,
      assignedTo: leads.assignedTo,
      convertedOrderId: leads.convertedOrderId,
      score: leads.score,
      notes: leads.notes,
      followUpCount: leads.followUpCount,
      nextFollowUpAt: leads.nextFollowUpAt,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      landingTitle: landingPages.title,
      assignedToName: users.name,
    })
    .from(leads)
    .leftJoin(landingPages, eq(leads.landingPageId, landingPages.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(eq(leads.id, id))
    .limit(1);
  if (!row) return null;

  const events = await listLeadEvents(id);

  return {
    id: row.id,
    landingPageId: row.landingPageId,
    source: row.source as LeadSource,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    formData: asStringMap(row.formData),
    status: row.status as LeadStatus,
    assignedTo: row.assignedTo,
    assignedToName: row.assignedToName,
    convertedOrderId: row.convertedOrderId,
    score: row.score,
    notes: row.notes,
    followUpCount: row.followUpCount ?? 0,
    nextFollowUpAt: row.nextFollowUpAt,
    landingTitle: row.landingTitle,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    events,
  };
}

async function listLeadEvents(leadId: string): Promise<LeadEventView[]> {
  const rows = await db
    .select({
      id: leadEvents.id,
      type: leadEvents.type,
      payload: leadEvents.payload,
      actorId: leadEvents.actorId,
      actorName: users.name,
      createdAt: leadEvents.createdAt,
    })
    .from(leadEvents)
    .leftJoin(users, eq(leadEvents.actorId, users.id))
    .where(eq(leadEvents.leadId, leadId))
    .orderBy(asc(leadEvents.createdAt), asc(leadEvents.id));
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: asObject(row.payload),
    actorId: row.actorId,
    actorName: row.actorName,
    createdAt: row.createdAt,
  }));
}

/** Board header counts — one histogram via GROUP BY over the status enum. */
export async function getLeadBoardCounts(): Promise<LeadBoardCounts> {
  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .groupBy(leads.status);

  const counts: LeadBoardCounts = {
    new: 0,
    contacted: 0,
    qualified: 0,
    negotiating: 0,
    follow_up: 0,
    converted: 0,
    lost: 0,
    total: 0,
  };
  let total = 0;
  for (const row of rows) {
    const status = row.status as LeadStatus;
    if (status in counts) {
      counts[status] = row.count;
      total += row.count;
    }
  }
  counts.total = total;
  return counts;
}

/** Staff/superadmin/admin roster for the assign dropdown. Active users only. */
export async function listStaffUsers(): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        inArray(users.role, [...STAFF_ROLES]),
        eq(users.status, "active"),
      ),
    )
    .orderBy(asc(users.name), asc(users.id));
  return rows;
}

/** Resolve one user's email — used by the submit flow to route the
 *  auto-assignment notification to the newly assigned staff member. */
export async function getUserEmailById(id: string): Promise<string | null> {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  return row?.email ?? null;
}

/**
 * Round-robin over the staff roster, LEAST-recently-assigned first: every staff
 * user is ranked by the created_at of their MOST recently assigned lead (users
 * who have never been assigned rank first, NULLS first), ties broken by account
 * age so the rotator is deterministic. Returns null when no assignable user
 * exists — the caller treats that as "leave the lead unassigned".
 */
export async function pickNextAssignee(): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .leftJoin(leads, eq(leads.assignedTo, users.id))
    .where(
      and(
        inArray(users.role, [...STAFF_ROLES]),
        eq(users.status, "active"),
      ),
    )
    .groupBy(users.id, users.name)
    .orderBy(sql`max(${leads.createdAt}) asc nulls first`, asc(users.createdAt), asc(users.id))
    .limit(1);
  return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
}

// ---- writes ------------------------------------------------------------------

export type InsertLeadInput = {
  landingPageId: string;
  source: LeadSource;
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  formData?: Record<string, string> | null;
};

/**
 * Insert a lead and stamp its "created" audit event. Public entry point for a
 * verified form submission (source "landing"). The caller has already validated
 * the payload and projected name/email/phone/message (deriveLeadContact) —
 * this function only persists + records. Phone is stored as the submitted value
 * or "" so the DB's NOT NULL column can never reject a valid email-only lead.
 */
export async function insertLeadPublic(input: InsertLeadInput): Promise<{ id: string }> {
  // Row + "created" audit event land atomically: if the event insert fails the
  // row rolls back, so a public client never sees a persisted lead reported as
  // a failure (which would make a retry duplicate the lead).
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(leads)
      .values({
        landingPageId: input.landingPageId,
        source: input.source,
        name: input.name,
        email: input.email?.trim() ? input.email.trim() : null,
        phone: input.phone?.trim() ? input.phone.trim() : "",
        message: input.message?.trim() ? input.message.trim() : null,
        formData:
          input.formData && Object.keys(input.formData).length > 0 ? input.formData : null,
      })
      .returning({ id: leads.id });

    await addLeadEventOn(tx, row.id, { type: "created", payload: { source: input.source } });
    return { id: row.id };
  });
}

/** Event insert bound to a db or transaction handle. Typed to only what it
 *  uses (`.insert`) so both the module `db` and a `db.transaction` callback's
 *  `tx` satisfy it. Every row-write + audit-event pair below runs on the SAME
 *  handle inside one transaction, so an event that throws rolls the row write
 *  back with it (no lead-without-timeline, no retry-duplicate). */
async function addLeadEventOn(
  exec: Pick<typeof db, "insert">,
  leadId: string,
  input: { type: string; payload?: Record<string, unknown>; actorId?: string | null },
): Promise<{ id: string }> {
  const write: typeof leadEvents.$inferInsert = { leadId, type: input.type };
  if (input.payload && Object.keys(input.payload).length > 0) write.payload = input.payload;
  if (input.actorId) write.actorId = input.actorId;
  const [row] = await exec.insert(leadEvents).values(write).returning({ id: leadEvents.id });
  return { id: row.id };
}

/** Append one audit event to a lead's timeline (standalone, auto-commit). */
export async function addLeadEvent(
  leadId: string,
  input: { type: string; payload?: Record<string, unknown>; actorId?: string | null },
): Promise<{ id: string }> {
  return addLeadEventOn(db, leadId, input);
}

async function assertAssigneeCanServe(assigneeId: string): Promise<string> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(
      and(
        eq(users.id, assigneeId),
        inArray(users.role, [...STAFF_ROLES]),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  if (!row) {
    throw new LeadError("NOT_FOUND", "The assignee is not an active staff member.");
  }
  return row.name;
}

async function requireLead(id: string): Promise<void> {
  const [row] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, id)).limit(1);
  if (!row) throw new LeadError("NOT_FOUND", `Lead ${id} not found.`);
}

/**
 * Move a lead to another pipeline status (kanban drag / status select). Logs a
 * "status" event carrying from → to. "converted" routes through the same
 * transition markLeadConverted uses (a "converted" event, never a plain status
 * event) so both callers converge on identical state + timeline. The status
 * write and its audit event commit atomically.
 */
export async function changeLeadStatus(
  leadId: string,
  toStatus: LeadStatus,
  opts: { actorId?: string | null; note?: string | null } = {},
): Promise<LeadDetail> {
  const current = await getLeadDetail(leadId);
  if (!current) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  if (current.status === toStatus) return current;

  if (toStatus === "converted") return transitionToConverted(current, opts);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id });
    if (!row) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
    await addLeadEventOn(tx, leadId, {
      type: "status",
      actorId: opts.actorId ?? null,
      payload: {
        from: current.status,
        to: toStatus,
        ...(opts.note ? { note: opts.note } : {}),
      },
    });
  });

  const detail = await getLeadDetail(leadId);
  if (!detail) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  return detail;
}

/**
 * Assign (or unassign) a lead to a staff member. Verifies the assignee is on
 * the active staff roster (assigned_to is not a FK, so the check is done here
 * rather than by the DB). Logs an "assigned" event with the resolved name.
 */
export async function assignLead(
  leadId: string,
  assigneeId: string | null,
  opts: { actorId?: string | null } = {},
): Promise<LeadDetail> {
  await requireLead(leadId);
  const assigneeName = assigneeId ? await assertAssigneeCanServe(assigneeId) : null;

  // Assignment write + "assigned" audit event commit atomically.
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id });
    if (!row) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
    await addLeadEventOn(tx, leadId, {
      type: "assigned",
      actorId: opts.actorId ?? null,
      payload: { assigneeId, assigneeName },
    });
  });

  const detail = await getLeadDetail(leadId);
  if (!detail) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  return detail;
}

/**
 * Mark a lead converted. Plan 5 wiring: callers may pass the created order id,
 * which is stored on leads.convertedOrderId and echoed into the "converted"
 * event payload (bookings convertLeadToOrder does exactly that). Without an
 * order id the P4 behavior is unchanged. Idempotent — an already-converted
 * lead is returned untouched with no duplicate event.
 */
export async function markLeadConverted(
  leadId: string,
  opts: { actorId?: string | null; convertedOrderId?: string | null } = {},
): Promise<LeadDetail> {
  const current = await getLeadDetail(leadId);
  if (!current) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  // Already converted: still wire a NEW order link (§2.6 quotation → order
  // path converts at quotation creation, then links the order on conversion).
  if (current.status === "converted") {
    if (opts.convertedOrderId && opts.convertedOrderId !== current.convertedOrderId) {
      await db.transaction(async (tx) => {
        await tx
          .update(leads)
          .set({ convertedOrderId: opts.convertedOrderId, updatedAt: new Date() })
          .where(eq(leads.id, leadId));
        await addLeadEventOn(tx, leadId, {
          type: "converted",
          actorId: opts.actorId ?? null,
          payload: { from: current.status, convertedOrderId: opts.convertedOrderId ?? null },
        });
      });
      const detail = await getLeadDetail(leadId);
      if (!detail) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
      return detail;
    }
    return current;
  }
  return transitionToConverted(current, opts);
}

async function transitionToConverted(
  current: LeadDetail,
  opts: { actorId?: string | null; convertedOrderId?: string | null },
): Promise<LeadDetail> {
  // Conversion write + "converted" audit event commit atomically.
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({
        status: "converted",
        updatedAt: new Date(),
        ...(opts.convertedOrderId ? { convertedOrderId: opts.convertedOrderId } : {}),
      })
      .where(eq(leads.id, current.id))
      .returning({ id: leads.id });
    if (!row) throw new LeadError("NOT_FOUND", `Lead ${current.id} not found.`);
    await addLeadEventOn(tx, current.id, {
      type: "converted",
      actorId: opts.actorId ?? null,
      payload: { from: current.status, convertedOrderId: opts.convertedOrderId ?? null },
    });
  });

  const detail = await getLeadDetail(current.id);
  if (!detail) throw new LeadError("NOT_FOUND", `Lead ${current.id} not found.`);
  return detail;
}

/**
 * Replace the operator-facing notes column (the note composer on the detail
 * page). Logs a "note" event so the timeline keeps the full history — even a
 * cleared note is recorded with its (now empty) text.
 */
export async function updateLeadNote(
  leadId: string,
  note: string,
  opts: { actorId?: string | null } = {},
): Promise<LeadDetail> {
  await requireLead(leadId);
  const trimmed = note?.trim() ?? "";

  // Note write + "note" audit event commit atomically.
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({ notes: trimmed === "" ? null : trimmed, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id });
    if (!row) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
    await addLeadEventOn(tx, leadId, {
      type: "note",
      actorId: opts.actorId ?? null,
      payload: { note: trimmed },
    });
  });

  const detail = await getLeadDetail(leadId);
  if (!detail) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  return detail;
}

/**
 * Log a follow-up (§2.6): increments followUpCount, sets nextFollowUpAt,
 * and appends a `follow_up` event (payload=note, actorId=user) so history
 * shows who/when. Atomic write + event.
 */
export async function logLeadFollowUp(
  leadId: string,
  input: { note: string; nextFollowUpAt?: Date | null },
  opts: { actorId?: string | null } = {},
): Promise<LeadDetail> {
  const current = await getLeadDetail(leadId);
  if (!current) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  const note = input.note?.trim() ?? "";
  if (!note) throw new LeadError("NOT_FOUND", "Follow-up note is required.");

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(leads)
      .set({
        followUpCount: sql`${leads.followUpCount} + 1`,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id });
    if (!row) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
    await addLeadEventOn(tx, leadId, {
      type: "follow_up",
      actorId: opts.actorId ?? null,
      payload: {
        note,
        count: (current.followUpCount ?? 0) + 1,
        nextFollowUpAt: input.nextFollowUpAt ? input.nextFollowUpAt.toISOString() : null,
      },
    });
  });

  const detail = await getLeadDetail(leadId);
  if (!detail) throw new LeadError("NOT_FOUND", `Lead ${leadId} not found.`);
  return detail;
}

/** Follow-ups due: nextFollowUpAt <= now, not converted/lost (§2.10 queue). */
export async function listFollowUpsDue(limit = 50): Promise<LeadListItem[]> {
  const rows = await db
    .select(listCols)
    .from(leads)
    .leftJoin(landingPages, eq(leads.landingPageId, landingPages.id))
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(
      and(
        sql`${leads.nextFollowUpAt} <= now()`,
        sql`${leads.status} not in ('converted', 'lost')`,
      ),
    )
    .orderBy(asc(leads.nextFollowUpAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    landingTitle: row.landingTitle,
    status: row.status as LeadStatus,
    assignedToName: row.assignedToName,
    score: row.score,
    createdAt: row.createdAt,
    source: row.source as LeadSource,
  }));
}
