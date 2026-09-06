import { z } from "zod";

// Pure zod schemas + constants for the leads module — no DB, no server-only,
// no imports from server modules — so it is safe to import from server actions,
// the service layer, admin server components and unit tests alike (the same
// contract as modules/catalog/validation.ts).
//
// These must stay in sync with the drizzle pgEnum tables in schema.ts:
//   leads.status  <-> lead_status
//   leads.source  <-> lead_source

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "converted",
  "lost",
] as const;
export const leadStatusSchema = z.enum(LEAD_STATUSES);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const LEAD_SOURCES = ["landing", "organic", "manual"] as const;
export const leadSourceSchema = z.enum(LEAD_SOURCES);
export type LeadSource = z.infer<typeof leadSourceSchema>;

/** Hidden honeypot field name on public lead forms. Any non-empty value marks
 *  a bot: the submit action pretends success and stores nothing. */
export const HONEYPOT_FIELD = "company_website";

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");
