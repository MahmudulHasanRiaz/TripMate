"use server";

/**
 * Leads — guarded server actions.
 *
 * TWO surfaces live here:
 *
 * 1. PUBLIC submitLead — the landing-page lead form's server endpoint. Guarded
 *    with withGuard({ public:true, rateLimit }) (10 submits/min/IP) + a honeypot
 *    (HONEYPOT_FIELD). The visitor's payload is validated AT this boundary
 *    against the landing page's OWN configured form schema (buildLeadSchema) —
 *    never trusted raw — then:
 *      insert (created event) → auto-assign round-robin (assigned event) →
 *      customer + staff emails → CAPI "Lead" fire-and-log.
 *    Every side-effect that can fail on its own (CAPI, email, assignment) is
 *    wrapped so a slow/down Meta or SMTP never fails or stalls the lead insert;
 *    the lead row is the source of truth and always lands first.
 *
 * 2. ADMIN group — the kanban/list/detail write surface. Each action is a
 *    withGuard({ permission:"leads.manage" }) + relay + zod .safeParse boundary
 *    (parsed.data, never raw input) and expires BOTH cache tags the admin reads
 *    through after every mutation:
 *      - CACHE_TAGS.leads     — board counts / list
 *      - CACHE_TAGS.lead(id)  — the one lead's detail render
 *    updateTag is the read-your-own-writes choice (Next 16; the single-arg
 *    revalidateTag form is deprecated).
 *
 * The plain READ service functions (listLeads, getLeadDetail, getLeadBoardCounts,
 * listStaffUsers, …) are deliberately NOT re-exported from this 'use server'
 * file: re-exporting an async service fn here would expose it as an unguarded
 * client-callable server action. Admin server components import them directly
 * from service.ts (server-only) and carry their own route-level guard — the
 * same split every other module uses.
 */

import { updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { HONEYPOT_FIELD, leadStatusSchema, uuidSchema } from "./validation";
import {
  assignLead,
  changeLeadStatus,
  deriveLeadContact,
  getUserEmailById,
  insertLeadPublic,
  LeadError,
  logLeadFollowUp,
  markLeadConverted,
  pickNextAssignee,
  updateLeadNote,
} from "./service";
import { getPublishedLandingBySlug } from "@/modules/landing-pages/service";
import { buildLeadSchema } from "@/modules/landing-pages/section-types";
import { trackCapiEvent } from "@/modules/tracking/service";
import { renderLeadAssigned, renderLeadReceived } from "@/modules/email/templates/lead";
import { sendEmail } from "@/modules/email/send";
import { getSetting } from "@/modules/settings/service";

// ==============================================================================
// PUBLIC — submitLead
// ==============================================================================

export type SubmitLeadInput = {
  /** The landing page slug (must resolve to a PUBLISHED page — never an id). */
  landingSlug: string;
  /** The field-keyed values the visitor submitted (validated server-side). */
  formData: Record<string, string>;
  /** Browser-captured _fbp/_fbc (the Meta dedup identifiers), if any. */
  fbParams?: { fbp?: string; fbc?: string } | null;
  /** Honeypot value (kept top-level for the LeadForm island; the formData key
   *  is also checked). Any non-empty value marks a bot. */
  honeypot?: string;
};

export type SubmitLeadResult =
  | { ok: true; leadId: string }
  | { ok: true; fakeOk: true }
  | {
      ok: false;
      error: "not_found" | "validation" | "RATE_LIMITED" | "UNAUTHORIZED";
      /** Field-keyed messages for the form; the "form" key is top-level. */
      fieldErrors?: Record<string, string>;
    };

/** Structural envelope check — formData VALUES are validated per-landing. */
const submitLeadInput = z.object({
  landingSlug: z.string().trim().min(1).max(200),
  formData: z.record(z.string(), z.unknown()),
  fbParams: z
    .object({
      fbp: z.string().trim().max(512).optional(),
      fbc: z.string().trim().max(1024).optional(),
    })
    .nullable()
    .optional(),
  honeypot: z.string().max(1000).optional(),
});

/** Map zod issues to field keys (empty path → the top-level "form" key). */
function leadFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Public relay: RATE_LIMITED/UNAUTHORIZED GuardErrors → { ok:false, error }. */
function publicRelay(
  action: (input: SubmitLeadInput, rateKey?: string) => Promise<SubmitLeadResult>,
): (input: SubmitLeadInput) => Promise<SubmitLeadResult> {
  return async (input: SubmitLeadInput): Promise<SubmitLeadResult> => {
    try {
      return await action(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code === "RATE_LIMITED" ? "RATE_LIMITED" : "UNAUTHORIZED" };
      }
      throw e;
    }
  };
}

function appOrigin(): string {
  return process.env.APP_URL?.trim().replace(/\/+$/, "") ?? "";
}

/** Absolute public URL of a landing page for CAPI event_source_url. */
function landingSourceUrl(slug: string): string | undefined {
  const origin = appOrigin();
  return origin ? `${origin}/l/${slug}` : undefined;
}

/** The site row's phone (customer receipt CTA) or a fallback when unreadable. */
async function sitePhoneOr(fallback: string): Promise<string> {
  try {
    const site = await getSetting("site");
    return site?.phone?.trim() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * The landing lead form's server endpoint.
 *
 * Order matters: honeypot → landing lookup → per-form validation → insert →
 * auto-assign → emails → CAPI. Nothing past the insert is allowed to fail the
 * submission; failures are logged and swallowed so a botched CAPI/email never
 * turns a stored lead into an error response.
 */
const runSubmitLead = publicRelay(
  withGuard(
    { public: true, rateLimit: { limit: 10, windowMs: 60_000 } },
    async (raw: SubmitLeadInput): Promise<SubmitLeadResult> => {
      // Envelope trust boundary — parsed.data (coerced) is all that is used.
      const parsed = submitLeadInput.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: "validation", fieldErrors: leadFieldErrors(parsed.error.issues) };
      }
      const { landingSlug, formData, fbParams, honeypot } = parsed.data;

      // Honeypot: pretend success, store nothing — do NOT insert.
      const honeypotHit =
        (typeof honeypot === "string" && honeypot.trim() !== "") ||
        (typeof formData[HONEYPOT_FIELD] === "string" &&
          formData[HONEYPOT_FIELD].trim() !== "");
      if (honeypotHit) return { ok: true, fakeOk: true };

      const landing = await getPublishedLandingBySlug(landingSlug);
      if (!landing) return { ok: false, error: "not_found" };

      const formConfig = landing.form.formConfig;
      if (!formConfig) {
        return {
          ok: false,
          error: "validation",
          fieldErrors: { form: "This landing page does not collect enquiries." },
        };
      }

      // The per-landing trust boundary: validate against THIS form's schema.
      const form = buildLeadSchema(formConfig).safeParse(formData);
      if (!form.success) {
        return { ok: false, error: "validation", fieldErrors: leadFieldErrors(form.error.issues) };
      }
      const submitted = form.data;

      const contact = deriveLeadContact(submitted, formConfig.fields);
      const { id: leadId } = await insertLeadPublic({
        landingPageId: landing.id,
        source: "landing",
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        message: contact.message,
        formData: submitted,
      });
      // New lead = fresh board state — refresh the admin read-through tag.
      updateTag(CACHE_TAGS.leads);

      // Auto-assign (null-safe) — failure must never fail the submission.
      let assigneeId: string | null = null;
      let assignedToName: string | null = null;
      try {
        const next = await pickNextAssignee();
        if (next) {
          assigneeId = next.id;
          const assigned = await assignLead(leadId, next.id);
          assignedToName = assigned.assignedToName;
        }
      } catch (e) {
        console.error("[leads] auto-assign failed", e);
      }

      // Staff notification email (assigned staff member only). Never throws.
      try {
        if (assigneeId && assignedToName) {
          const staffEmail = await getUserEmailById(assigneeId);
          if (staffEmail) {
            const adminUrl = `${appOrigin()}/admin/leads/${leadId}`;
            const { subject, html } = renderLeadAssigned({
              leadName: contact.name,
              landingTitle: landing.title,
              adminUrl,
              assignedToName,
            });
            await sendEmail({ to: staffEmail, subject, html });
          }
        }
      } catch (e) {
        console.error("[leads] staff email failed", e);
      }

      // Customer receipt (only when the visitor left an email). Never throws.
      try {
        if (contact.email) {
          const { subject, html } = renderLeadReceived({
            name: contact.name,
            landingTitle: landing.title,
            sitePhone: await sitePhoneOr(""),
          });
          await sendEmail({ to: contact.email, subject, html });
        }
      } catch (e) {
        console.error("[leads] customer email failed", e);
      }

      // Meta CAPI "Lead" — fire-and-log. A Meta/network failure resolves
      // { ok:false } inside trackCapiEvent and is swallowed here; the request
      // is never blocked by CAPI and the insert never depends on it.
      try {
        const sourceUrl = landingSourceUrl(landing.slug);
        await trackCapiEvent(
          {
            eventName: "Lead",
            eventId: randomUUID(),
            sourceUrl,
            user: {
              email: contact.email || null,
              phone: contact.phone || null,
              fbp: fbParams?.fbp ?? null,
              fbc: fbParams?.fbc ?? null,
            },
            customData: { landingSlug: landing.slug },
          },
          { sourceUrl },
        );
      } catch (e) {
        console.error("[leads] CAPI Lead event failed", e);
      }

      return { ok: true, leadId };
    },
  ),
);

/** Client-facing public action (single object arg; rate key is derived from IP). */
export const submitLead = async (input: SubmitLeadInput): Promise<SubmitLeadResult> =>
  runSubmitLead(input);

// ==============================================================================
// ADMIN — lead management
// ==============================================================================

export type LeadActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/**
 * Guard + relay wrapper for the leads admin surface: withGuard(leads.manage) +
 * GuardError → { ok:false, error }, LeadError → { ok:false, code, error }.
 * Anything else re-throws to the global error boundary.
 */
function leadAction<TInput, TOutput extends LeadActionResult>(
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "leads.manage" }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof LeadError) {
        return { ok: false, code: e.code, error: e.message } as unknown as TOutput;
      }
      throw e;
    }
  };
}

/** Expire both cache tags every admin lead mutation reads through. */
function expireLead(id: string): void {
  updateTag(CACHE_TAGS.leads);
  updateTag(CACHE_TAGS.lead(id));
}

/** First failing zod issue rendered as "path: message" for the UI. */
function parseLeadInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
}

const leadIdOnlyInput = z.object({ id: uuidSchema });
const changeStatusInput = z.object({ id: uuidSchema, status: leadStatusSchema });
/** assigneeId arrives as a uuid, "" or null from the select — all mean "the
 *  dropdown cleared"; normalized to null before the service call. */
const assignInput = z.object({
  id: uuidSchema,
  assigneeId: z.union([z.literal(""), uuidSchema]).nullable().optional(),
});
const updateNoteInput = z.object({
  id: uuidSchema,
  note: z.string().trim().max(4000, "Note must be 4000 characters or fewer").optional(),
});

type LeadIdRef = { id: string };

/** Kanban drag / status select — move a lead across the pipeline. */
export const changeLeadStatusAction = leadAction<unknown, LeadActionResult<LeadIdRef>>(
  async (input, session) => {
    const parsed = parseLeadInput(changeStatusInput, input);
    if (!parsed.ok) return parsed;
    await changeLeadStatus(parsed.data.id, parsed.data.status, {
      actorId: session?.user.id ?? null,
    });
    expireLead(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);

/** Assign / unassign (assigneeId null) from the detail page select. */
export const assignLeadAction = leadAction<unknown, LeadActionResult<LeadIdRef>>(
  async (input, session) => {
    const parsed = parseLeadInput(assignInput, input);
    if (!parsed.ok) return parsed;
    const assigneeId =
      parsed.data.assigneeId == null || parsed.data.assigneeId === "" ? null : parsed.data.assigneeId;
    await assignLead(parsed.data.id, assigneeId, {
      actorId: session?.user.id ?? null,
    });
    expireLead(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);

/** Mark converted (clears the board; full order wiring is Plan 5). */
export const convertLeadAction = leadAction<unknown, LeadActionResult<LeadIdRef>>(
  async (input, session) => {
    const parsed = parseLeadInput(leadIdOnlyInput, input);
    if (!parsed.ok) return parsed;
    await markLeadConverted(parsed.data.id, { actorId: session?.user.id ?? null });
    expireLead(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);

/** Replace the operator notes via the detail page composer. */
export const updateLeadNoteAction = leadAction<unknown, LeadActionResult<LeadIdRef>>(
  async (input, session) => {
    const parsed = parseLeadInput(updateNoteInput, input);
    if (!parsed.ok) return parsed;
    await updateLeadNote(parsed.data.id, parsed.data.note ?? "", {
      actorId: session?.user.id ?? null,
    });
    expireLead(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);

const logFollowUpInput = z.object({
  id: uuidSchema,
  note: z.string().trim().min(1, "Follow-up note is required").max(4000),
  nextFollowUpAt: z.string().datetime({ offset: true }).nullable().optional(),
});

/** Log a follow-up: increments count, sets next date, appends timeline event (§2.6). */
export const logFollowUpAction = leadAction<unknown, LeadActionResult<LeadIdRef>>(
  async (input, session) => {
    const parsed = parseLeadInput(logFollowUpInput, input);
    if (!parsed.ok) return parsed;
    await logLeadFollowUp(
      parsed.data.id,
      {
        note: parsed.data.note,
        nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
      },
      { actorId: session?.user.id ?? null },
    );
    expireLead(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);
