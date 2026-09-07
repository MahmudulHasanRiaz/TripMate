import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { leads } from "@/modules/leads/schema";
import { orders } from "./schema";

export const quotationStatusEnum = pgEnum("quotation_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "converted",
]);

export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteNo: text("quote_no").notNull().unique(), // e.g. QT-2026-0001
  leadId: uuid("lead_id").references(() => leads.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).default("0"),
  grossProfit: numeric("gross_profit", { precision: 14, scale: 2 }).default("0"),
  notes: text("notes"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  status: quotationStatusEnum("status").notNull().default("draft"),
  convertedOrderId: uuid("converted_order_id").references(() => orders.id),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("quotations_status_idx").on(table.status),
  index("quotations_lead_id_idx").on(table.leadId),
]);

export const quotationItems = pgTable("quotation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quotationId: uuid("quotation_id")
    .notNull()
    .references(() => quotations.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).default("0"),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("quotation_items_quotation_id_idx").on(table.quotationId),
]);
