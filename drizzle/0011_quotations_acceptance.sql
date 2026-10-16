ALTER TABLE "quotations" ADD COLUMN "accepted_by" text;
--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "accepted_at" timestamp with time zone;
