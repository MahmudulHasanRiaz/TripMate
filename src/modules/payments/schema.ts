import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { orders } from "@/modules/bookings/schema";

export const gatewayKindEnum = pgEnum("gateway_kind", [
  "manual",
  "paylater",
  "sslcommerz",
  "bkash",
  "nagad",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "refunded",
]);

export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  kind: gatewayKindEnum("kind").notNull(),
  config: jsonb("config"),
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  gatewayId: uuid("gateway_id").references(() => paymentGateways.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BDT"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  methodTxnId: text("method_txn_id"),
  senderNumber: text("sender_number"),
  submittedScreenshotUrl: text("submitted_screenshot_url"),
  verifiedBy: uuid("verified_by"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
