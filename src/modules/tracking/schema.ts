import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  anonId: text("anon_id"),
  sessionId: text("session_id"),
  userId: uuid("user_id"),
  eventName: text("event_name").notNull(),
  sourceUrl: text("source_url"),
  referrer: text("referrer"),
  fbParams: jsonb("fb_params"),
  capiStatus: text("capi_status"),
  capiResponse: jsonb("capi_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("tracking_events_user_id_idx").on(table.userId),
  index("tracking_events_anon_id_idx").on(table.anonId),
  index("tracking_events_event_name_idx").on(table.eventName),
]);
