import "server-only";

import { renderLeadAssigned, renderLeadReceived } from "./templates/lead";
import {
  renderOrderConfirm,
  renderPaymentRejected,
  renderPaymentVerified,
  renderQuoteReady,
} from "./templates/order";

/**
 * Email-template ADMIN PREVIEW surface (Plan 6 T4) — server-only.
 *
 * A static registry of the six shipped transactional templates (the render
 * functions in templates/lead.tsx and templates/order.tsx), plus:
 *
 *   - listEmailTemplates() — serializable metadata (no render fn, no sample
 *     values) for the admin email-templates page,
 *   - renderEmailTemplatePreview(id, overrides?) — renders the REAL template
 *     with its sample params, optionally overridden, returning
 *     { subject, html } for a preview pane.
 *
 * PREVIEW ONLY — there is no template editing in v1: the source of truth is
 * the code (templates/*.tsx + their call sites in the leads/bookings/payments
 * actions). The admin UI can render what the templates produce, never modify
 * them; a template change is a code change.
 *
 * SECURITY: sampleParams are FICTIONAL safe values — RFC-2606 .example URLs,
 * obviously-sample names/phones/numbers. Never real customer PII, and never
 * values copied from production data. Override values arrive from the guarded
 * action (settings.manage + zod ≤500 chars); unknown keys are REJECTED (a
 * typo'd override silently ignored is worse than a clear error), and number
 * params (quote-ready's quotedPrice) are coerced with a finite-number check
 * so the render fns always receive the types they were written against.
 */

export class EmailAdminError extends Error {
  constructor(
    public code: "NOT_FOUND" | "UNKNOWN_PARAM" | "INVALID_PARAM",
    message: string,
  ) {
    super(message);
  }
}

export type EmailTemplateAudience = "customer" | "staff";

export type EmailTemplateParam = {
  key: string;
  type: "string" | "number";
};

/** The serializable slice the admin UI consumes (listEmailTemplates). */
export type EmailTemplateSummary = {
  id: string;
  name: string;
  description: string;
  audience: EmailTemplateAudience;
  params: readonly EmailTemplateParam[];
};

type RenderedEmail = { subject: string; html: string };

type EmailTemplateDefinition = EmailTemplateSummary & {
  /** Fictional, fully-typed sample values — the preview's default params. */
  sampleParams: Record<string, string | number>;
  /** The real render fn this registry entry points at (code = source of truth). */
  render: (params: Record<string, string | number>) => RenderedEmail;
};

/**
 * Registry-entry helper: infers the sample param shape P from sampleParams and
 * requires the render fn to accept exactly that shape, so every entry's
 * sampleParams are type-checked against its real render signature at compile
 * time (a renamed template param breaks the build, not the preview). The one
 * cast below is sound because renderEmailTemplatePreview only ever calls
 * render with a merged object carrying exactly the sample keys, with each
 * value coerced to its sample's type (numbers Number()-checked, strings as-is).
 */
function defineTemplate<P extends Record<string, string | number>>(
  meta: {
    id: string;
    name: string;
    description: string;
    audience: EmailTemplateAudience;
  },
  sampleParams: P,
  render: (params: P) => RenderedEmail,
): EmailTemplateDefinition {
  return {
    ...meta,
    params: Object.entries(sampleParams).map(([key, value]) => ({
      key,
      type: typeof value === "number" ? ("number" as const) : ("string" as const),
    })),
    sampleParams,
    render: render as (params: Record<string, string | number>) => RenderedEmail,
  };
}

/** Sample URLs use the reserved .example TLD — realistic shape, zero real host. */
const SAMPLE_PORTAL_URL = "https://tripmate.example/account/orders";
const SAMPLE_ADMIN_URL = "https://tripmate.example/admin/leads";

const EMAIL_TEMPLATES: readonly EmailTemplateDefinition[] = [
  defineTemplate(
    {
      id: "lead-received",
      name: "Lead received",
      description:
        "Customer receipt sent when a landing-page enquiry is submitted — confirms receipt and offers the site phone.",
      audience: "customer",
    },
    {
      name: "Ayesha Rahman",
      landingTitle: "Sundarbans Tour",
      sitePhone: "+880 1700 000000",
    },
    renderLeadReceived,
  ),
  defineTemplate(
    {
      id: "lead-assigned",
      name: "Lead assigned",
      description:
        "Staff alert sent when the round-robin assigner hands a new lead to a team member — links to the lead inbox.",
      audience: "staff",
    },
    {
      leadName: "Ayesha Rahman",
      landingTitle: "Sundarbans Tour",
      adminUrl: SAMPLE_ADMIN_URL,
      assignedToName: "Tania",
    },
    renderLeadAssigned,
  ),
  defineTemplate(
    {
      id: "order-confirm",
      name: "Booking received",
      description:
        "Customer notice sent when a package booking or inquiry order is placed — order number, booked item, portal link.",
      audience: "customer",
    },
    {
      orderNo: "TM-2026-0001",
      customerName: "Ayesha Rahman",
      listingTitle: "7-Day Umrah Package",
      portalUrl: SAMPLE_PORTAL_URL,
    },
    renderOrderConfirm,
  ),
  defineTemplate(
    {
      id: "quote-ready",
      name: "Quote ready",
      description:
        "Customer notice sent when an operator sets the quoted price — order number, formatted amount, portal payment link.",
      audience: "customer",
    },
    {
      orderNo: "TM-2026-0001",
      customerName: "Ayesha Rahman",
      listingTitle: "7-Day Umrah Package",
      quotedPrice: 185000,
      currency: "BDT",
      portalUrl: SAMPLE_PORTAL_URL,
    },
    renderQuoteReady,
  ),
  defineTemplate(
    {
      id: "payment-verified",
      name: "Payment verified",
      description:
        "Customer notice sent when an operator verifies a submitted payment — order number and verified amount.",
      audience: "customer",
    },
    {
      orderNo: "TM-2026-0001",
      customerName: "Ayesha Rahman",
      amount: 85000,
      currency: "BDT",
    },
    renderPaymentVerified,
  ),
  defineTemplate(
    {
      id: "payment-rejected",
      name: "Payment could not be verified",
      description:
        "Customer notice sent when a payment cannot be verified — gentle retry copy with the operator's reason.",
      audience: "customer",
    },
    {
      orderNo: "TM-2026-0001",
      customerName: "Ayesha Rahman",
      note: "Transaction ID not found on our statement — please double-check and resubmit.",
    },
    renderPaymentRejected,
  ),
];

/** The registry's serializable metadata — safe to hand to the admin UI. */
export function listEmailTemplates(): EmailTemplateSummary[] {
  return EMAIL_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    audience: template.audience,
    params: template.params,
  }));
}

/**
 * Render a template preview: the REAL render fn with its sample params,
 * overlaid by `overrides` (string values; number params are coerced and
 * finite-checked). Unknown template ids and unknown override keys throw
 * EmailAdminError — the guarded action relays those to the client.
 */
export function renderEmailTemplatePreview(
  id: string,
  overrides?: Record<string, string>,
): RenderedEmail {
  const template = EMAIL_TEMPLATES.find((entry) => entry.id === id);
  if (!template) {
    throw new EmailAdminError("NOT_FOUND", `Unknown email template "${id}"`);
  }

  const merged: Record<string, string | number> = { ...template.sampleParams };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    const sample = template.sampleParams[key];
    if (sample === undefined) {
      throw new EmailAdminError(
        "UNKNOWN_PARAM",
        `Template "${id}" has no parameter "${key}" (parameters: ${template.params
          .map((param) => param.key)
          .join(", ")})`,
      );
    }
    if (typeof sample === "number") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new EmailAdminError(
          "INVALID_PARAM",
          `Parameter "${key}" must be a number (got "${value}")`,
        );
      }
      merged[key] = numeric;
    } else {
      merged[key] = value;
    }
  }

  return template.render(merged);
}
