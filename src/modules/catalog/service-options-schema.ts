import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { serviceCategories } from "./schema";

export const serviceOptions = pgTable("service_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => serviceCategories.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  duration: text("duration"), // e.g. "5 Years", "10 Years"
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  deliveryTime: text("delivery_time"), // e.g. "15-21 Working Days"
  requirements: jsonb("requirements"), // list of document requirements
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seo: jsonb("seo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("service_options_category_idx").on(table.categoryId),
  index("service_options_active_idx").on(table.isActive),
  index("service_options_sort_order_idx").on(table.sortOrder),
]);
