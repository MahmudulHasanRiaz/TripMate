import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
});
