import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
]);

export const postCategories = pgTable("post_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content"),
  featuredImage: jsonb("featured_image"),
  gallery: jsonb("gallery"),
  videoUrl: text("video_url"),
  authorId: uuid("author_id"),
  categoryId: uuid("category_id").references(() => postCategories.id),
  status: contentStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seo: jsonb("seo"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("posts_status_idx").on(table.status),
  index("posts_category_id_idx").on(table.categoryId),
  index("posts_published_at_idx").on(table.publishedAt),
]);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sections: jsonb("sections"),
  seo: jsonb("seo"),
  status: contentStatusEnum("status").notNull().default("draft"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("pages_status_idx").on(table.status)]);
