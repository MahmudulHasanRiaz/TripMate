import "server-only";
import {
  and,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { escapeLike, paginate } from "@/lib/db-utils";
import { trackingEvents } from "./schema";
import { buildMetaEvent, type MetaEventInput } from "./lib";
import { CAPI_STATUS, sendCapiEvent } from "./capi";

// All DB queries for the tracking module (the admin event log + the server-side
// Meta CAPI funnel). Server-only — importing this into a client bundle fails the
// build. Follows the same conventions as modules/catalog + modules/content:
//   - search input is LIKE-escaped so it is matched literally,
//   - jsonb cells are free-form at rest; every read is projected defensively,
//   - writes never touch the shape the schema already guarantees (a uuid id,
//     created_at default).
//
// `trackCapiEvent` is the ordered pipeline: persist the event row FIRST (the
// durable record), then send to Meta and write the outcome back onto that same
// row. Because sendCapiEvent never throws, a Meta/network failure can only ever
// leave the row's capiStatus as `error`/`meta_not_configured` — the caller is
// never blocked by CAPI, and the admin log keeps the full picture.

// ---- public types ------------------------------------------------------------

export type Paginated<T> = { items: T[]; total: number };

/** The read projection of a tracking_events row (jsonb cells normalized). */
export type TrackingEventView = {
  id: string;
  eventName: string;
  anonId: string | null;
  sessionId: string | null;
  userId: string | null;
  sourceUrl: string | null;
  referrer: string | null;
  fbParams: Record<string, unknown> | null;
  capiStatus: string | null;
  capiResponse: Record<string, unknown> | null;
  createdAt: Date;
};

export type TrackingEventLogInput = {
  eventName: string;
  anonId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  sourceUrl?: string | null;
  referrer?: string | null;
  fbParams?: Record<string, unknown> | null;
  capiStatus?: string | null;
  capiResponse?: Record<string, unknown> | null;
};

export type TrackingCapiMeta = {
  sourceUrl?: string;
  fbParams?: Record<string, unknown>;
  anonId?: string;
};

export type TrackingEventsQuery = {
  page?: number;
  perPage?: number;
  eventName?: string;
  capiStatus?: string;
  search?: string;
};

export type TrackingEventCounts = {
  total: number;
  /** Histogram by CAPI outcome (status is null for rows logged, never sent). */
  byStatus: { status: string | null; count: number }[];
  byEventName: { eventName: string; count: number }[];
};

// ---- row helpers ------------------------------------------------------------

const eventCols = {
  id: trackingEvents.id,
  eventName: trackingEvents.eventName,
  anonId: trackingEvents.anonId,
  sessionId: trackingEvents.sessionId,
  userId: trackingEvents.userId,
  sourceUrl: trackingEvents.sourceUrl,
  referrer: trackingEvents.referrer,
  fbParams: trackingEvents.fbParams,
  capiStatus: trackingEvents.capiStatus,
  capiResponse: trackingEvents.capiResponse,
  createdAt: trackingEvents.createdAt,
} as const;

type TrackingEventRow = {
  id: string;
  eventName: string;
  anonId: string | null;
  sessionId: string | null;
  userId: string | null;
  sourceUrl: string | null;
  referrer: string | null;
  fbParams: unknown;
  capiStatus: string | null;
  capiResponse: unknown;
  createdAt: Date;
};

function trackingSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(
    ilike(trackingEvents.anonId, pattern),
    ilike(trackingEvents.sessionId, pattern),
    ilike(trackingEvents.sourceUrl, pattern),
    ilike(trackingEvents.referrer, pattern),
  ) as SQL;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toEventView(row: TrackingEventRow): TrackingEventView {
  return {
    id: row.id,
    eventName: row.eventName,
    anonId: row.anonId,
    sessionId: row.sessionId,
    userId: row.userId,
    sourceUrl: row.sourceUrl,
    referrer: row.referrer,
    fbParams: asObject(row.fbParams),
    capiStatus: row.capiStatus,
    capiResponse: asObject(row.capiResponse),
    createdAt: row.createdAt,
  };
}

// ---- writes -----------------------------------------------------------------

/** Insert one tracking_events row. Absent optional fields are left NULL. */
export async function logTrackingEvent(
  input: TrackingEventLogInput,
): Promise<{ id: string }> {
  const write: typeof trackingEvents.$inferInsert = {
    eventName: input.eventName,
  };
  const setText = (key: "anonId" | "sessionId" | "sourceUrl" | "referrer", value: string | null | undefined) => {
    if (value !== undefined && value !== null && value !== "") write[key] = value;
  };
  setText("anonId", input.anonId);
  setText("sessionId", input.sessionId);
  setText("sourceUrl", input.sourceUrl);
  setText("referrer", input.referrer);
  if (input.userId) write.userId = input.userId;
  if (input.fbParams) write.fbParams = input.fbParams;
  if (input.capiStatus) write.capiStatus = input.capiStatus;
  if (input.capiResponse) write.capiResponse = input.capiResponse;

  const [row] = await db
    .insert(trackingEvents)
    .values(write)
    .returning({ id: trackingEvents.id });
  return { id: row.id };
}

/**
 * Log an event AND fire it to Meta CAPI.
 *
 * Order matters: the row is persisted first (a durable record that exists even
 * if the send never completes), then the Meta payload is built and sent. The
 * send outcome is written back onto the same row as capiStatus/capiResponse.
 * sendCapiEvent never throws, so trackCapiEvent always resolves — a caller that
 * awaits it is never held up by a slow/failing Meta call.
 */
export async function trackCapiEvent(
  event: MetaEventInput,
  meta: TrackingCapiMeta = {},
): Promise<{ id: string; eventId: string; capiStatus: string }> {
  const sourceUrl = meta.sourceUrl ?? event.sourceUrl;
  const eventId = event.eventId ?? randomUUID();

  const { id } = await logTrackingEvent({
    eventName: event.eventName,
    anonId: meta.anonId,
    sourceUrl,
    fbParams: meta.fbParams,
    capiStatus: CAPI_STATUS.pending,
  });

  const result = await sendCapiEvent(
    buildMetaEvent({ ...event, eventId, sourceUrl }),
  );

  const capiStatus = result.ok
    ? CAPI_STATUS.sent
    : result.error === CAPI_STATUS.notConfigured
      ? CAPI_STATUS.notConfigured
      : CAPI_STATUS.error;

  await db
    .update(trackingEvents)
    .set({ capiStatus, capiResponse: result as unknown as object })
    .where(eq(trackingEvents.id, id));

  return { id, eventId, capiStatus };
}

// ---- admin log reads ---------------------------------------------------------

/** Paginated admin log view with event-name / capi-status / free-text filters. */
export async function listTrackingEvents(
  query: TrackingEventsQuery = {},
): Promise<Paginated<TrackingEventView>> {
  const conditions: SQL[] = [];

  const search = query.search?.trim();
  if (search) conditions.push(trackingSearchCondition(search));
  if (query.eventName) conditions.push(eq(trackingEvents.eventName, query.eventName));
  if (query.capiStatus) conditions.push(eq(trackingEvents.capiStatus, query.capiStatus));

  const where = and(...conditions);
  const { offset, perPage } = paginate({
    page: query.page,
    perPage: query.perPage,
    defaultPerPage: 25,
    maxPerPage: 100,
  });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(trackingEvents)
    .where(where);
  const rows = (await db
    .select(eventCols)
    .from(trackingEvents)
    .where(where)
    .orderBy(desc(trackingEvents.createdAt), desc(trackingEvents.id))
    .limit(perPage)
    .offset(offset)) as unknown as TrackingEventRow[];

  return { items: rows.map(toEventView), total: countRow.total };
}

/** Summary histograms for the admin log header (CAPI health + event mix). */
export async function getTrackingEventCounts(): Promise<TrackingEventCounts> {
  const [totalRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(trackingEvents);
  const statusRows = await db
    .select({ status: trackingEvents.capiStatus, count: sql<number>`count(*)::int` })
    .from(trackingEvents)
    .groupBy(trackingEvents.capiStatus);
  const eventRows = await db
    .select({ eventName: trackingEvents.eventName, count: sql<number>`count(*)::int` })
    .from(trackingEvents)
    .groupBy(trackingEvents.eventName);

  return {
    total: totalRow.total,
    byStatus: statusRows.map((r) => ({ status: r.status, count: r.count })),
    byEventName: eventRows.map((r) => ({ eventName: r.eventName, count: r.count })),
  };
}
