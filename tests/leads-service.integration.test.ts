import { afterEach, describe, expect, it, vi } from "vitest";
import "dotenv/config";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1 — same pattern as tests/catalog-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the leads service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as the other
// module integration suites.
//
// The real public submitLead server action (guard + honeypot + CAPI + email) is
// NOT callable under vitest's node env (getSession needs Next request state), so
// the tests exercise the service layer it is built from — insert → auto-assign
// → status/convert → assign → note — the exact submitLead happy path minus the
// request-bound side-effects.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("leads service (integration — Postgres)", () => {
  // Unique-per-run marker so parallel/leftover rows can never be picked up by
  // another run or a failed previous run.
  const marker = `it-lead-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const landingSlug = `it-lead-landing-${marker}`;
  const landingTitle = `Lead Integration Landing ${marker}`;
  const emails = {
    lead: `lead-${marker}@test.local`,
    staff1: `staff1-${marker}@test.local`,
    staff2: `staff2-${marker}@test.local`,
    customer: `customer-${marker}@test.local`,
  };
  /** Lead ids created by this test (for precise FK-safe cleanup). */
  const leadIds: string[] = [];

  const purge = async () => {
    const { db } = await import("@/db/client");
    const { landingPages, leadEvents, leads } = await import("@/modules/leads/schema");
    const { users } = await import("@/modules/users/schema");
    const { eq, inArray } = await import("drizzle-orm");

    const leadRows = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.email, emails.lead));
    const ids = [...new Set([...leadRows.map((r) => r.id), ...leadIds])];
    if (ids.length > 0) {
      await db.delete(leadEvents).where(inArray(leadEvents.leadId, ids));
      await db.delete(leads).where(inArray(leads.id, ids));
    }
    await db.delete(landingPages).where(eq(landingPages.slug, landingSlug));
    await db
      .delete(users)
      .where(inArray(users.email, [emails.lead, emails.staff1, emails.staff2, emails.customer]));
  };
  afterEach(async () => {
    // Best-effort: a failed cleanup must not fail a passing test nor strand a
    // row for the next test. Pre-run purge keeps the suites independent.
    await purge().catch(() => {});
  });

  /** A published landing page carrying a realistic lead-capture form. */
  const createLanding = async () => {
    const { db } = await import("@/db/client");
    const { landingPages } = await import("@/modules/leads/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(landingPages).where(eq(landingPages.slug, landingSlug));
    const [row] = await db
      .insert(landingPages)
      .values({
        title: landingTitle,
        slug: landingSlug,
        status: "published",
        formConfig: {
          title: "Get a quote",
          fields: [
            { key: "name", label: "Full name", type: "text", required: true },
            { key: "phone", label: "Phone", type: "tel", required: true },
            { key: "email", label: "Email", type: "email", required: false },
          ],
        },
      })
      .returning({ id: landingPages.id });
    return row.id;
  };

  const createUser = async (email: string, role: "staff" | "customer", name: string) => {
    const { db } = await import("@/db/client");
    const { users } = await import("@/modules/users/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(users).where(eq(users.email, email));
    const [row] = await db
      .insert(users)
      .values({ email, role, name, status: "active" })
      .returning({ id: users.id });
    return row.id;
  };

  const createLead = async (landingPageId: string, phone = "+8801712345678") => {
    const { insertLeadPublic } = await import("@/modules/leads/service");
    const { id } = await insertLeadPublic({
      landingPageId,
      source: "landing",
      name: `Lead ${marker}`,
      email: emails.lead,
      phone,
      message: "Please send a quote",
      formData: { name: `Lead ${marker}`, phone, email: emails.lead, message: "Please send a quote" },
    });
    leadIds.push(id);
    return id;
  };

  it("insertLeadPublic → created event; listLeads/getLeadDetail/boardCounts all see it", async () => {
    const landingId = await createLanding();
    const service = await import("@/modules/leads/service");

    const before = await service.getLeadBoardCounts();
    const id = await createLead(landingId);
    const after = await service.getLeadBoardCounts();

    const detail = await service.getLeadDetail(id);
    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({
      id,
      status: "new",
      source: "landing",
      name: `Lead ${marker}`,
      email: emails.lead,
      phone: "+8801712345678",
      message: "Please send a quote",
      assignedTo: null,
      convertedOrderId: null,
      landingTitle,
    });
    expect(detail?.formData).toEqual({
      name: `Lead ${marker}`,
      phone: "+8801712345678",
      email: emails.lead,
      message: "Please send a quote",
    });
    // The insert stamps a "created" audit event with no actor.
    expect(detail?.events.some((e) => e.type === "created")).toBe(true);
    const created = detail?.events.find((e) => e.type === "created");
    expect(created?.actorId).toBeNull();

    const page = await service.listLeads({ search: marker, sort: "newest" });
    const mine = page.items.find((l) => l.id === id);
    expect(mine).toMatchObject({
      id,
      name: `Lead ${marker}`,
      email: emails.lead,
      landingTitle,
      status: "new",
      source: "landing",
    });

    // Residue-tolerant board assertions (the shared DB may hold other leads).
    expect(after.new).toBeGreaterThanOrEqual(before.new + 1);
    expect(after.total).toBeGreaterThanOrEqual(before.total + 1);
  });

  it("getLeadDetail returns null for an unknown id", async () => {
    const { getLeadDetail } = await import("@/modules/leads/service");
    expect(
      await getLeadDetail("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("round-robin: pickNextAssignee returns a staff user and rotates after assignment", async () => {
    const service = await import("@/modules/leads/service");
    const { eq } = await import("drizzle-orm");
    const { leadEvents, leads } = await import("@/modules/leads/schema");
    const { db } = await import("@/db/client");

    const staff1 = await createUser(emails.staff1, "staff", `Staff One ${marker}`);
    await createUser(emails.staff2, "staff", `Staff Two ${marker}`);

    const first = await service.pickNextAssignee();
    expect(first).not.toBeNull();
    // The candidate is always on the active staff roster.
    const roster = await service.listStaffUsers();
    expect(roster.some((u) => u.id === first?.id)).toBe(true);

    // Assign a fresh lead to the first pick → they now rank most-recently-used.
    const landingId = await createLanding();
    const id = await createLead(landingId);
    await service.assignLead(id, first!.id, { actorId: staff1 });
    const detail = await service.getLeadDetail(id);
    expect(detail?.assignedTo).toBe(first!.id);
    expect(detail?.assignedToName).toBe(first!.name);
    expect(detail?.events.some((e) => e.type === "assigned")).toBe(true);

    // Re-pick: the LEAST-recently-assigned rule must hand it to someone else
    // (staff2 or any other staff member still ranks ahead of the one we just used).
    const second = await service.pickNextAssignee();
    expect(second?.id).not.toBe(first!.id);

    // Hard-cleanup the assigned lead (events first — lead_events holds an FK to
    // it; the afterEach purge keys off tracked ids, but removing it here keeps
    // the shared DB tidy even between this test and the next).
    const [leadRow] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.email, emails.lead))
      .limit(1);
    if (leadRow) {
      await db.delete(leadEvents).where(eq(leadEvents.leadId, leadRow.id));
      await db.delete(leads).where(eq(leads.id, leadRow.id));
    }
  });

  it("assignLead to a non-staff customer is refused (typed NOT_FOUND)", async () => {
    const landingId = await createLanding();
    const service = await import("@/modules/leads/service");
    const customer = await createUser(emails.customer, "customer", `Customer ${marker}`);
    const id = await createLead(landingId);

    await expect(service.assignLead(id, customer)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    // The lead is left untouched.
    const detail = await service.getLeadDetail(id);
    expect(detail?.assignedTo).toBeNull();
  });

  it("changeLeadStatus logs a status event; markLeadConverted clears the inbox", async () => {
    const landingId = await createLanding();
    const service = await import("@/modules/leads/service");
    const staff1 = await createUser(emails.staff1, "staff", `Staff One ${marker}`);
    const id = await createLead(landingId);

    const moved = await service.changeLeadStatus(id, "contacted", { actorId: staff1 });
    expect(moved.status).toBe("contacted");
    const movedEvents = (await service.getLeadDetail(id))!.events;
    const statusEvent = movedEvents.find((e) => e.type === "status");
    expect(statusEvent).toMatchObject({
      actorId: staff1,
      payload: { from: "new", to: "contacted" },
    });

    const converted = await service.markLeadConverted(id, { actorId: staff1 });
    expect(converted.status).toBe("converted");
    expect(converted.convertedOrderId).toBeNull(); // full order wiring is Plan 5

    const events = (await service.getLeadDetail(id))!.events;
    const convertedEvents = events.filter((e) => e.type === "converted");
    expect(convertedEvents).toHaveLength(1);
    expect(convertedEvents[0].payload).toMatchObject({ from: "contacted" });

    // Idempotent: converting an already-converted lead adds no duplicate event.
    await service.markLeadConverted(id, { actorId: staff1 });
    expect(
      (await service.getLeadDetail(id))!.events.filter((e) => e.type === "converted"),
    ).toHaveLength(1);
  });

  it("updateLeadNote replaces the notes column and logs a note event", async () => {
    const landingId = await createLanding();
    const service = await import("@/modules/leads/service");
    const staff1 = await createUser(emails.staff1, "staff", `Staff One ${marker}`);
    const id = await createLead(landingId);

    const saved = await service.updateLeadNote(id, "Call after 5pm", { actorId: staff1 });
    expect(saved.notes).toBe("Call after 5pm");
    const noteEvent = (await service.getLeadDetail(id))!.events.find((e) => e.type === "note");
    expect(noteEvent).toMatchObject({ actorId: staff1, payload: { note: "Call after 5pm" } });

    // Clearing the note still records history with the now-empty text.
    await service.updateLeadNote(id, "  ", { actorId: staff1 });
    const cleared = await service.getLeadDetail(id);
    expect(cleared?.notes).toBeNull();
  });

  it("deriveLeadContact reads reserved keys and falls back to typed fields", async () => {
    const { deriveLeadContact } = await import("@/modules/leads/service");
    const { buildLeadSchema } = await import("@/modules/landing-pages/section-types");

    const fields = [
      { key: "your_name", label: "Your name", type: "text" as const, required: true },
      { key: "contact_number", label: "Phone", type: "tel" as const, required: true },
      { key: "contact_email", label: "Email", type: "email" as const, required: false },
    ];
    const schema = buildLeadSchema({ fields });
    const parsed = schema.parse({
      your_name: "  Karim  ",
      contact_number: "+8801712345678",
      contact_email: "karim@example.com",
    });

    // Reserved keys absent → tel/email values ride the TYPE fallback.
    expect(deriveLeadContact(parsed, fields)).toEqual({
      name: "",
      email: "karim@example.com",
      phone: "+8801712345678",
      message: null,
    });

    // Reserved keys win when present.
    const withReserved = deriveLeadContact(
      { name: "Karim", phone: "017...", email: "x@y.com", message: "Hi" },
      [],
    );
    expect(withReserved).toEqual({
      name: "Karim",
      email: "x@y.com",
      phone: "017...",
      message: "Hi",
    });
  });
});
