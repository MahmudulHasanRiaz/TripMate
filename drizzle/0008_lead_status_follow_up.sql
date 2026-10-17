-- §2.6: add 'follow_up' to lead_status.
-- Transaction-safe replacement (drizzle migrations run in a transaction, and
-- ALTER TYPE ... ADD VALUE cannot run inside one): drop default → new enum →
-- USING cast → drop old → rename → restore default. No DML in this migration.
ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
CREATE TYPE "public"."lead_status_new" AS ENUM('new', 'contacted', 'qualified', 'negotiating', 'follow_up', 'converted', 'lost');
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "public"."lead_status_new" USING "status"::text::"public"."lead_status_new";
--> statement-breakpoint
DROP TYPE "public"."lead_status";
--> statement-breakpoint
ALTER TYPE "public"."lead_status_new" RENAME TO "lead_status";
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."lead_status";
