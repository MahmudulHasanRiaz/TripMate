import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const serviceKindEnum = pgEnum("service_kind", [
  "package",
  "inquiry_based",
  "redirect",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "published",
  "archived",
]);

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  kind: serviceKindEnum("kind").notNull(),
  redirectUrl: text("redirect_url"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const destinations = pgTable("destinations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => serviceCategories.id),
  destinationId: uuid("destination_id").references(() => destinations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  description: text("description"),
  coverImage: jsonb("cover_image"),
  gallery: jsonb("gallery"),
  videoUrl: text("video_url"),
  durationDays: integer("duration_days"),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("BDT"),
  itinerary: jsonb("itinerary"),
  inclusions: jsonb("inclusions"),
  exclusions: jsonb("exclusions"),
  formConfig: jsonb("form_config"),
  status: listingStatusEnum("status").notNull().default("draft"),
  seo: jsonb("seo"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("listings_status_idx").on(table.status),
  index("listings_category_id_idx").on(table.categoryId),
  index("listings_destination_id_idx").on(table.destinationId),
  index("listings_deleted_at_idx").on(table.deletedAt),
]);
