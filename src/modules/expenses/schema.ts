import {
  boolean,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const expenseKindEnum = pgEnum("expense_kind", [
  "operational",
  "cost_of_sales",
  "other",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "pending",
  "approved",
  "rejected",
]);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: expenseKindEnum("kind").notNull().default("operational"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => expenseCategories.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BDT"),
  date: date("date").notNull(),
  description: text("description"),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  orderId: uuid("order_id"),
  createdBy: uuid("created_by"),
  status: expenseStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
