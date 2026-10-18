ALTER TABLE "accounts" ALTER COLUMN "issuer" SET DEFAULT 'local';--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "tracking_events_capi_status_idx" ON "tracking_events" USING btree ("capi_status");--> statement-breakpoint
CREATE INDEX "tracking_events_created_at_idx" ON "tracking_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "listings_created_at_idx" ON "listings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_events_lead_id_idx" ON "lead_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_next_follow_up_at_idx" ON "leads" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "order_status_events_order_id_idx" ON "order_status_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_listing_id_idx" ON "orders" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "orders_lead_id_idx" ON "orders" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "travelers_order_id_idx" ON "travelers" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_status_updated_at_idx" ON "payments" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_order_id_idx" ON "expenses" USING btree ("order_id");