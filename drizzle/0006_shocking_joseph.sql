ALTER TABLE "media_files" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
CREATE INDEX "media_files_owner_user_id_idx" ON "media_files" USING btree ("owner_user_id");