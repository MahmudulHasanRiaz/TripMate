import { pgEnum, pgTable, text, timestamp, uuid, bigint } from "drizzle-orm/pg-core";

export const mediaDiskEnum = pgEnum("media_disk", ["local", "r2"]);

export const mediaFiles = pgTable("media_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  disk: mediaDiskEnum("disk").notNull().default("local"),
  path: text("path").notNull(),
  url: text("url").notNull(),
  mime: text("mime").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  alt: text("alt"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
