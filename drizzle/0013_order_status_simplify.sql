-- §2.7: simplify order_status to pending, confirmed, completed, cancelled.
-- Safe replacement (no in-place delete): drop default → new enum → USING
-- mapping (quoted → confirmed, in_review → pending) → drop old → rename →
-- restore default. Covers orders.status AND
-- order_status_events.from_status/to_status. No DML in this migration.
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
CREATE TYPE "public"."order_status_new" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');
--> statement-breakpoint
ALTER TABLE "order_status_events" ALTER COLUMN "from_status" TYPE "public"."order_status_new" USING (
  CASE "from_status"::text
    WHEN 'quoted' THEN 'confirmed'::"public"."order_status_new"
    WHEN 'in_review' THEN 'pending'::"public"."order_status_new"
    ELSE "from_status"::text::"public"."order_status_new"
  END
);
--> statement-breakpoint
ALTER TABLE "order_status_events" ALTER COLUMN "to_status" TYPE "public"."order_status_new" USING (
  CASE "to_status"::text
    WHEN 'quoted' THEN 'confirmed'::"public"."order_status_new"
    WHEN 'in_review' THEN 'pending'::"public"."order_status_new"
    ELSE "to_status"::text::"public"."order_status_new"
  END
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status_new" USING (
  CASE "status"::text
    WHEN 'quoted' THEN 'confirmed'::"public"."order_status_new"
    WHEN 'in_review' THEN 'pending'::"public"."order_status_new"
    ELSE "status"::text::"public"."order_status_new"
  END
);
--> statement-breakpoint
DROP TYPE "public"."order_status";
--> statement-breakpoint
ALTER TYPE "public"."order_status_new" RENAME TO "order_status";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."order_status";
