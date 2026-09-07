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
import { destinations } from "./schema";

export const visaTypes = pgTable("visa_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("visa_types_sort_order_idx").on(table.sortOrder),
  index("visa_types_is_active_idx").on(table.isActive),
]);

export const visaServices = pgTable("visa_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  destinationId: uuid("destination_id")
    .notNull()
    .references(() => destinations.id),
  visaTypeId: uuid("visa_type_id")
    .notNull()
    .references(() => visaTypes.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  processingTime: text("processing_time"),
  validity: text("validity"),
  stayDuration: text("stay_duration"),
  requirements: jsonb("requirements"), // list of string requirements or structured checklist
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seo: jsonb("seo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("visa_services_dest_idx").on(table.destinationId),
  index("visa_services_type_idx").on(table.visaTypeId),
  index("visa_services_active_idx").on(table.isActive),
]);
