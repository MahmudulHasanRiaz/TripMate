CREATE TYPE "public"."user_role" AS ENUM('superadmin', 'admin', 'staff', 'customer');--> statement-breakpoint
CREATE TYPE "public"."media_disk" AS ENUM('local', 'r2');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	"permissions" text[],
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"disk" "media_disk" DEFAULT 'local' NOT NULL,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"alt" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anon_id" text,
	"session_id" text,
	"user_id" uuid,
	"event_name" text NOT NULL,
	"source_url" text,
	"referrer" text,
	"fb_params" jsonb,
	"capi_status" text,
	"capi_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
