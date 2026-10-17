import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { listings } from "@/modules/catalog/schema";

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    tripLabel: text("trip_label"),
    packageId: uuid("package_id").references(() => listings.id, { onDelete: "set null" }),
    quote: text("quote").notNull(),
    rating: integer("rating").notNull().default(5),
    photoUrl: text("photo_url"),
    videoUrl: text("video_url"),
    galleryUrls: jsonb("gallery_urls").$type<string[]>(),
    featured: boolean("featured").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("testimonials_published_idx").on(table.isPublished),
    index("testimonials_featured_idx").on(table.featured),
    index("testimonials_sort_order_idx").on(table.sortOrder),
    index("testimonials_package_id_idx").on(table.packageId),
  ],
);

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
