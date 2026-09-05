import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const orderTypeEnum = pgEnum("order_type", ["package", "inquiry"]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "in_review",
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
]);

export const orderSourceEnum = pgEnum("order_source", [
  "website",
  "lead_conversion",
  "manual",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: text("order_no").notNull().unique(),
  userId: uuid("user_id"),
  customerSnapshot: jsonb("customer_snapshot").notNull(),
  listingId: uuid("listing_id"),
  listingSnapshot: jsonb("listing_snapshot"),
  type: orderTypeEnum("type").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  quotedPrice: numeric("quoted_price", { precision: 14, scale: 2 }),
  finalPrice: numeric("final_price", { precision: 14, scale: 2 }),
  currency: text("currency").notNull().default("BDT"),
  specialRequests: text("special_requests"),
  source: orderSourceEnum("source").notNull().default("website"),
  leadId: uuid("lead_id"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("orders_status_idx").on(table.status)]);

export const orderStatusEvents = pgTable("order_status_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  actorId: uuid("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const travelers = pgTable("travelers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  name: text("name").notNull(),
  passportNo: text("passport_no"),
  dob: text("dob"),
  relation: text("relation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
