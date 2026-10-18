import { afterAll, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { eq } from "drizzle-orm";

// Regression guard for the production incident: better-auth's admin() plugin
// ('plugins: [admin()]' in src/lib/auth.ts) validates its schema fields against
// the Drizzle model on EVERY user write. With `banned`/`banReason`/`banExpires`
// (users) or `impersonatedBy` (sessions) missing, the setup wizard died with
// 'The field "banned" does not exist in the "users" Drizzle schema' — and the
// unit suite stayed green because nothing exercised better-auth's own user
// creation against the real schema. This test does exactly that.
vi.mock("server-only", () => ({}));

const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("better-auth admin plugin ↔ Drizzle schema (integration)", () => {
  const marker = `auth-${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
  const email = `admin-schema-${marker}@test.local`;
  let createdUserId: string | undefined;

  afterAll(async () => {
    if (!createdUserId) return;
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");
    // sessions/accounts cascade on user delete.
    await db.delete(users).where(eq(users.id, createdUserId));
  });

  it("signUpEmail succeeds — every admin-plugin field exists in the schema and the row carries its defaults", async () => {
    const { auth } = await import("@/lib/auth");
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");

    const created = (await auth.api.signUpEmail({
      body: { email, password: "integration-pass-123", name: "Admin Schema Check" },
    })) as { user?: { id?: string } };

    createdUserId = created.user?.id;
    expect(createdUserId, "signUpEmail must return the created user id").toBeTruthy();

    const [row] = await db.select().from(users).where(eq(users.id, createdUserId!)).limit(1);
    expect(row).toBeTruthy();
    // The admin plugin's fields must round-trip with their DB defaults — this
    // is what the BetterAuthError blocked before migration 0015.
    expect(row!.banned).toBe(false);
    expect(row!.banReason).toBeNull();
    expect(row!.banExpires).toBeNull();
    expect(row!.email).toBe(email);
    // The admin plugin injects its OWN defaultRole on user-create hooks; it
    // must map to a value of our user_role enum (admin({ defaultRole })).
    expect(row!.role).toBe("customer");
  }, 30_000);
});
