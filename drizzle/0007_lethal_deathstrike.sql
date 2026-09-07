CREATE TYPE "public"."order_payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'converted');--> statement-breakpoint
CREATE TABLE "visa_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"visa_type_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"processing_time" text,
	"validity" text,
	"stay_duration" text,
	"requirements" jsonb,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"seo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visa_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "visa_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visa_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"duration" text,
	"price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"delivery_time" text,
	"requirements" jsonb,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"seo" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_options_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"unit_cost" numeric(12, 2) DEFAULT '0',
	"total_price" numeric(12, 2) NOT NULL,
	"total_cost" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_no" text NOT NULL,
	"lead_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"total_price" numeric(14, 2) NOT NULL,
	"total_cost" numeric(14, 2) DEFAULT '0',
	"gross_profit" numeric(14, 2) DEFAULT '0',
	"notes" text,
	"valid_until" timestamp with time zone,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"converted_order_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_quote_no_unique" UNIQUE("quote_no")
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "destinations" ADD COLUMN "seo" jsonb;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cost_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "starting_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cost_price" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gross_profit" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "order_payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "visa_services" ADD CONSTRAINT "visa_services_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_services" ADD CONSTRAINT "visa_services_visa_type_id_visa_types_id_fk" FOREIGN KEY ("visa_type_id") REFERENCES "public"."visa_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_options" ADD CONSTRAINT "service_options_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_converted_order_id_orders_id_fk" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visa_services_dest_idx" ON "visa_services" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "visa_services_type_idx" ON "visa_services" USING btree ("visa_type_id");--> statement-breakpoint
CREATE INDEX "visa_services_active_idx" ON "visa_services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "visa_types_sort_order_idx" ON "visa_types" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "visa_types_is_active_idx" ON "visa_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "service_options_category_idx" ON "service_options" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "service_options_active_idx" ON "service_options" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "service_options_sort_order_idx" ON "service_options" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_lead_id_idx" ON "quotations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "listings_is_featured_idx" ON "listings" USING btree ("is_featured");