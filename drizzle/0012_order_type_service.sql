-- §2.7: add 'service' to order_type for generic/offline service sales.
-- Transaction-safe replacement — see 0008. No DML in this migration.
CREATE TYPE "public"."order_type_new" AS ENUM('package', 'inquiry', 'service');
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "type" TYPE "public"."order_type_new" USING "type"::text::"public"."order_type_new";
--> statement-breakpoint
DROP TYPE "public"."order_type";
--> statement-breakpoint
ALTER TYPE "public"."order_type_new" RENAME TO "order_type";
