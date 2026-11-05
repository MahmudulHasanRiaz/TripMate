ALTER TABLE "destinations" ADD COLUMN "gallery" jsonb;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "videos" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "videos" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "videos" jsonb;--> statement-breakpoint
-- FU-35 backfill: fold each legacy single video_url into the new videos
-- array as its first entry. Row-safe (plain text → jsonb construction cannot
-- fail per-row) and idempotent: the predicate only matches rows whose videos
-- array is still empty, so re-running changes nothing.
UPDATE "listings" SET "videos" = jsonb_build_array(jsonb_build_object('url', "video_url", 'title', '')) WHERE "video_url" IS NOT NULL AND btrim("video_url") <> '' AND ("videos" IS NULL OR "videos" = '[]'::jsonb);--> statement-breakpoint
UPDATE "posts" SET "videos" = jsonb_build_array(jsonb_build_object('url', "video_url", 'title', '')) WHERE "video_url" IS NOT NULL AND btrim("video_url") <> '' AND ("videos" IS NULL OR "videos" = '[]'::jsonb);