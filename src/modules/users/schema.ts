import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "superadmin",
  "admin",
  "staff",
  "customer",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: text("status").notNull().default("active"),
  avatarUrl: text("avatar_url"),
  permissions: text("permissions").array(), // null = role defaults
  leadId: uuid("lead_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
