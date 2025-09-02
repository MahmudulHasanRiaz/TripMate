-- Drop existing tables and types in a safe order
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "contact_messages" CASCADE;
DROP TABLE IF EXISTS "media" CASCADE;
DROP TABLE IF EXISTS "packages" CASCADE;
DROP TABLE IF EXISTS "destinations" CASCADE;
DROP TABLE IF EXISTS "package_types" CASCADE;
DROP TABLE IF EXISTS "posts" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "pages" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "site_status" CASCADE;
DROP TABLE IF EXISTS "global_settings" CASCADE;
DROP TABLE IF EXISTS "site_pages" CASCADE;

DROP TYPE IF EXISTS "page_status" CASCADE;
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "booking_status" CASCADE;
DROP TYPE IF EXISTS "media_type" CASCADE;
DROP TYPE IF EXISTS "social_link_platform" CASCADE;


-- Create custom types
CREATE TYPE "page_status" AS ENUM ('published', 'draft');
CREATE TYPE "user_role" AS ENUM ('customer', 'staff', 'admin', 'superadmin');
CREATE TYPE "booking_status" AS ENUM ('Pending', 'Confirmed', 'Cancelled');
CREATE TYPE "media_type" AS ENUM ('image', 'video', 'pdf', 'file');
CREATE TYPE "social_link_platform" AS ENUM ('twitter', 'facebook', 'instagram', 'linkedin', 'youtube');


-- Create tables
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "username" TEXT UNIQUE,
    "name" TEXT,
    "phone" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "site_status" (
    "id" INT PRIMARY KEY,
    "is_setup_complete" BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE "pages" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "content" TEXT,
    "status" "page_status" DEFAULT 'draft' NOT NULL,
    "show_in_menu" BOOLEAN DEFAULT false NOT NULL,
    "menu_order" INT DEFAULT 99,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "posts" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "content" TEXT,
    "featured_image_url" TEXT,
    "featured_image_hint" TEXT,
    "gallery_images" JSONB,
    "author_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "published_at" TIMESTAMPTZ,
    "video_url" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "categories" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE "posts" ADD FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;

CREATE TABLE "destinations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "image_url" TEXT
);

CREATE TABLE "package_types" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "image_url" TEXT
);

CREATE TABLE "packages" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "destination" TEXT,
    "duration" INT,
    "price" INT,
    "rating" FLOAT,
    "image_url" TEXT,
    "image_hint" TEXT,
    "gallery_images" JSONB,
    "video_url" TEXT,
    "description" TEXT,
    "itinerary" JSONB,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "bookings" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "package_id" TEXT REFERENCES "packages"("id") ON DELETE SET NULL,
    "package_name" TEXT,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "travelers" INT,
    "departure_date" TIMESTAMPTZ,
    "booking_date" TIMESTAMPTZ,
    "status" "booking_status" DEFAULT 'Pending',
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "contact_messages" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "submitted_at" TIMESTAMPTZ DEFAULT now(),
    "is_read" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "media" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT,
    "type" "media_type",
    "url" TEXT,
    "size" TEXT,
    "alt_text" TEXT,
    "data_ai_hint" TEXT,
    "uploaded_at" TIMESTAMPTZ DEFAULT now(),
    "modified_at" TIMESTAMPTZ DEFAULT now(),
    "deleted_at" TIMESTAMPTZ
);

CREATE TABLE "global_settings" (
    "id" INT PRIMARY KEY DEFAULT 1,
    "site_title" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "search_engine_visibility" BOOLEAN,
    "footer_description" TEXT,
    "quick_links" JSONB,
    "support_links" JSONB,
    "social_links" JSONB,
    "google_map_embed_code" TEXT,
    CONSTRAINT "singleton_check" CHECK (id = 1)
);

CREATE TABLE "site_pages" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT,
    "content" TEXT,
    "items" JSONB,
    "status" "page_status" DEFAULT 'published'
);

-- Create the home_page_settings table
CREATE TABLE IF NOT EXISTS "home_page_settings" (
    "id" TEXT PRIMARY KEY DEFAULT 'home',
    "hero_image_url" TEXT,
    "hero_title" TEXT,
    "hero_subtitle" TEXT,
    "hero_button_label" TEXT,
    "hero_button_link" TEXT,
    "status" "page_status" DEFAULT 'published',
    CONSTRAINT "singleton_check" CHECK (id = 'home')
);

-- Seed the home page settings table with default values
INSERT INTO "home_page_settings" (id, hero_image_url, hero_title, hero_subtitle, hero_button_label, hero_button_link, status)
VALUES ('home', 'https://placehold.co/1920x1080.png', 'Your Adventure Awaits', 'Discover breathtaking destinations.', 'Explore Packages', '/packages', 'published')
ON CONFLICT (id) DO NOTHING;