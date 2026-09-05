CREATE INDEX "tracking_events_user_id_idx" ON "tracking_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracking_events_anon_id_idx" ON "tracking_events" USING btree ("anon_id");--> statement-breakpoint
CREATE INDEX "tracking_events_event_name_idx" ON "tracking_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_category_id_idx" ON "listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "listings_destination_id_idx" ON "listings" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "listings_deleted_at_idx" ON "listings" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_category_id_idx" ON "posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "landing_pages_status_idx" ON "landing_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "expenses_category_id_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("status");