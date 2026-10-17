CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trip_label" text,
	"package_id" uuid,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"photo_url" text,
	"video_url" text,
	"gallery_urls" jsonb,
	"featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_package_id_listings_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_published_idx" ON "testimonials" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_featured_idx" ON "testimonials" USING btree ("featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_sort_order_idx" ON "testimonials" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_package_id_idx" ON "testimonials" USING btree ("package_id");