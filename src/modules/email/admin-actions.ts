"use server";

/**
 * Email-template admin PREVIEW action (Plan 6 T4) — the admin
 * email-templates page's preview button.
 *
 * previewEmailTemplateAction: withGuard({ permission: "settings.manage" })
 * (email templates are configuration surface, not content — the same ruling as
 * the site/home settings actions) + a zod boundary (id string, overrides an
 * optional string record with values ≤500 chars — parsed.data only, raw input
 * never reaches the service) + an EmailAdminError relay so the client gets
 * { ok:true, data } / { ok:false, code, error } and never depends on Next's
 * error serialization. PREVIEW ONLY — no editing: the source of truth is the
 * render code in templates/*.tsx; this action can never mutate anything.
 *
 * listEmailTemplates is deliberately NOT re-exported from this 'use server'
 * file: re-exporting a service fn here would expose it as an unguarded
 * client-callable server action. The admin page imports it directly from
 * admin.ts (server-only) under its own route-level guard — the same split
 * every other module uses.
 */

import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import { EmailAdminError, renderEmailTemplatePreview } from "./admin";

export type EmailTemplatePreviewResult =
  | { ok: true; data: { subject: string; html: string } }
  | { ok: false; code: string; error: string };

const previewInputSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "A template id is required")
    .max(64, "Template id must be 64 characters or fewer"),
  overrides: z
    .record(
      z.string().trim().min(1).max(64),
      z
        .string()
        .trim()
        .max(500, "Override values must be 500 characters or fewer"),
    )
    .optional(),
});

/** First failing zod issue rendered as "path: message" for the UI. */
function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".") ?? "";
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

const guardedPreview = withGuard<unknown, EmailTemplatePreviewResult>(
  { permission: "settings.manage" },
  async (input) => {
    const parsed = previewInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
    }
    try {
      const preview = renderEmailTemplatePreview(
        parsed.data.id,
        parsed.data.overrides,
      );
      return { ok: true, data: preview };
    } catch (e) {
      if (e instanceof EmailAdminError) {
        return { ok: false, code: e.code, error: e.message };
      }
      throw e;
    }
  },
);

export async function previewEmailTemplateAction(
  input: unknown,
): Promise<EmailTemplatePreviewResult> {
  try {
    return await guardedPreview(input);
  } catch (e) {
    if (e instanceof GuardError) {
      return { ok: false, code: e.code, error: e.message };
    }
    throw e;
  }
}
