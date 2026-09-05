CREATE TYPE "public"."lead_source" AS ENUM('landing', 'organic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('website', 'lead_conversion', 'manual');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'in_review', 'quoted', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('package', 'inquiry');--> statement-breakpoint
CREATE TYPE "public"."gateway_kind" AS ENUM('manual', 'paylater', 'sslcommerz', 'bkash', 'nagad');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'submitted', 'verified', 'rejected', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."expense_kind" AS ENUM('operational', 'cost_of_sales', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"sections" jsonb,
	"form_config" jsonb,
	"seo" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"fb_content_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landing_page_id" uuid,
	"listing_id" uuid,
	"source" "lead_source" DEFAULT 'landing' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"message" text,
	"form_data" jsonb,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"assigned_to" uuid,
	"converted_order_id" uuid,
	"score" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"note" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" text NOT NULL,
	"user_id" uuid,
	"customer_snapshot" jsonb NOT NULL,
	"listing_id" uuid,
	"listing_snapshot" jsonb,
	"type" "order_type" NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"quoted_price" numeric(14, 2),
	"final_price" numeric(14, 2),
	"currency" text DEFAULT 'BDT' NOT NULL,
	"special_requests" text,
	"source" "order_source" DEFAULT 'website' NOT NULL,
	"lead_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "travelers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"name" text NOT NULL,
	"passport_no" text,
	"dob" text,
	"relation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"kind" "gateway_kind" NOT NULL,
	"config" jsonb,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"gateway_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"method_txn_id" text,
	"sender_number" text,
	"submitted_screenshot_url" text,
	"verified_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "expense_kind" DEFAULT 'operational' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"date" date NOT NULL,
	"description" text,
	"vendor" text,
	"receipt_url" text,
	"order_id" uuid,
	"created_by" uuid,
	"status" "expense_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;