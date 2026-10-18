import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "follow_up",
  "converted",
  "lost",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "landing",
  "organic",
  "manual",
  "direct",
  "referral",
  "facebook",
  "instagram",
  "tiktok",
  "other",
]);

export const landingPages = pgTable("landing_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  sections: jsonb("sections"),
  formConfig: jsonb("form_config"),
  seo: jsonb("seo"),
  status: text("status").notNull().default("draft"),
  fbContentId: text("fb_content_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("landing_pages_status_idx").on(table.status)]);

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  landingPageId: uuid("landing_page_id").references(() => landingPages.id),
  listingId: uuid("listing_id"),
  source: leadSourceEnum("source").notNull().default("landing"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  message: text("message"),
  formData: jsonb("form_data"),
  status: leadStatusEnum("status").notNull().default("new"),
  assignedTo: uuid("assigned_to"),
  convertedOrderId: uuid("converted_order_id"),
  score: integer("score"),
  notes: text("notes"),
  followUpCount: integer("follow_up_count").notNull().default(0),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("leads_status_idx").on(table.status),
  index("leads_assigned_to_idx").on(table.assignedTo),
  index("leads_created_at_idx").on(table.createdAt),
  index("leads_next_follow_up_at_idx").on(table.nextFollowUpAt),
]);

export const leadEvents = pgTable("lead_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  actorId: uuid("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("lead_events_lead_id_idx").on(table.leadId)]);
