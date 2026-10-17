-- §2.6: extend lead_source (direct, referral, facebook, instagram, tiktok,
-- other; landing/organic/manual kept for history). Transaction-safe
-- replacement — see 0008. No DML in this migration.
ALTER TABLE "leads" ALTER COLUMN "source" DROP DEFAULT;
--> statement-breakpoint
CREATE TYPE "public"."lead_source_new" AS ENUM('landing', 'organic', 'manual', 'direct', 'referral', 'facebook', 'instagram', 'tiktok', 'other');
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" TYPE "public"."lead_source_new" USING "source"::text::"public"."lead_source_new";
--> statement-breakpoint
DROP TYPE "public"."lead_source";
--> statement-breakpoint
ALTER TYPE "public"."lead_source_new" RENAME TO "lead_source";
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'landing'::"public"."lead_source";
