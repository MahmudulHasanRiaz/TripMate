"use server";

/**
 * Bookings (orders) — guarded server actions.
 *
 * TWO surfaces live here:
 *
 * 1. PUBLIC createPackageOrderAction / createInquiryOrderAction — the public
 *    booking + inquiry forms' server endpoints. Guarded with
 *    withGuard({ public:true, rateLimit }) (10 submits/min/IP), validated AT
 *    this boundary (zod .safeParse → parsed.data, never raw input), then:
 *      published-listing check ({ok:false,error:'not_found'}) → create →
 *      updateTag(orders + order(id)) → CAPI "InitiateCheckout" fire-and-log.
 *    The signed-in customer's userId is linked onto the order when a session
 *    exists; anonymous orders carry none. Nothing after the create is allowed
 *    to fail the submission — CAPI failures are logged and swallowed so a
 *    stored order is never reported as an error (the same contract as
 *    submitLead).
 *
 * 2. ADMIN group — the order quote/status/lead-conversion surface. Each action
 *    is a withGuard({ permission:"orders.manage" }) + relay + zod .safeParse
 *    boundary (parsed.data) and expires BOTH cache tags the admin reads
 *    through after every mutation:
 *      - CACHE_TAGS.orders     — board counts / list
 *      - CACHE_TAGS.order(id)  — the one order's detail render
 *    The lead-conversion action additionally expires CACHE_TAGS.leads +
 *    CACHE_TAGS.lead(leadId) (the lead's board/detail changed too).
 *    updateTag is the read-your-own-writes choice (Next 16; the single-arg
 *    revalidateTag form is deprecated).
 *
 * The plain READ service functions (listOrders, getOrderDetail,
 * getOrderBoardCounts, myOrders, …) are deliberately NOT re-exported from this
 * 'use server' file: re-exporting an async service fn here would expose it as
 * an unguarded client-callable server action. Admin/portal server components
 * import them directly from service.ts (server-only) and carry their own
 * route-level guard — the same split every other module uses.
 */

import { updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getListingById } from "@/modules/catalog/service";
import { trackCapiEvent } from "@/modules/tracking/service";
import {
  convertLeadOrderInputSchema,
  inquiryFieldErrors,
  inquiryOrderInputSchema,
  orderStatusSchema,
  packageOrderInputSchema,
  uuidSchema,
  validateInquiryExtraFields,
  type InquiryOrderInput,
  type PackageOrderInput,
} from "./validation";
import {
  convertLeadToOrder,
  createInquiryOrder,
  createPackageOrder,
  OrderError,
  setQuote,
  transitionOrder,
} from "./service";

// ==============================================================================
// PUBLIC — package booking + inquiry submit
// ==============================================================================

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNo: string }
  | {
      ok: false;
      error: "not_found" | "validation" | "RATE_LIMITED" | "UNAUTHORIZED";
      /** Field-keyed messages for the form; the "form" key is top-level. */
      fieldErrors?: Record<string, string>;
    };

/** Public relay: GuardErrors → RATE_LIMITED/UNAUTHORIZED, a service NOT_FOUND
 *  (unknown or unpublished listing / vanished order) → not_found. Anything
 *  else re-throws to the global error boundary. */
function publicOrderRelay<TInput>(
  action: (input: TInput, rateKey?: string) => Promise<CreateOrderResult>,
): (input: TInput) => Promise<CreateOrderResult> {
  return async (input: TInput): Promise<CreateOrderResult> => {
    try {
      return await action(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code === "RATE_LIMITED" ? "RATE_LIMITED" : "UNAUTHORIZED" };
      }
      if (e instanceof OrderError && e.code === "NOT_FOUND") {
        return { ok: false, error: "not_found" };
      }
      throw e;
    }
  };
}

function appOrigin(): string {
  return process.env.APP_URL?.trim().replace(/\/+$/, "") ?? "";
}

/** Absolute public URL of a package detail page for CAPI event_source_url. */
function packageSourceUrl(slug: string): string | undefined {
  const origin = appOrigin();
  return origin ? `${origin}/packages/${slug}` : undefined;
}

/**
 * The public package-booking form's server endpoint.
 *
 * Order matters: zod boundary → published check → create (userId linked when
 * signed in) → cache tags → CAPI. Nothing past the create is allowed to fail
 * the submission; the CAPI fire-and-log is wrapped so a slow/down Meta never
 * turns a stored order into an error response.
 */
const runCreatePackageOrder = publicOrderRelay(
  withGuard(
    { public: true, rateLimit: { limit: 10, windowMs: 60_000 } },
    async (
      raw: PackageOrderInput,
      session: Session | null,
    ): Promise<CreateOrderResult> => {
      // Trust boundary — parsed.data (coerced) is all that is used.
      const parsed = packageOrderInputSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: "validation",
          fieldErrors: inquiryFieldErrors(parsed.error.issues),
        };
      }
      const input = parsed.data;

      const listing = await getListingById(input.listingId);
      if (!listing || listing.status !== "published") {
        return { ok: false, error: "not_found" };
      }

      const created = await createPackageOrder(input, {
        userId: session?.user.id ?? null,
      });

      // New order = fresh board/list state — refresh the admin read-through tags.
      updateTag(CACHE_TAGS.orders);
      updateTag(CACHE_TAGS.order(created.id));

      // Meta CAPI "InitiateCheckout" — fire-and-log. trackCapiEvent never
      // throws for a Meta/network failure (it resolves { ok:false } inside);
      // the try/catch also covers a logging DB hiccup so the request is never
      // blocked by tracking.
      try {
        const sourceUrl = packageSourceUrl(listing.slug);
        const customData: Record<string, unknown> = {
          orderNo: created.orderNo,
          listingId: listing.id,
          contentType: "product",
        };
        if (created.price !== null) {
          customData.value = created.price;
          customData.currency = created.currency;
        }
        await trackCapiEvent(
          {
            eventName: "InitiateCheckout",
            eventId: randomUUID(),
            sourceUrl,
            user: {
              email: input.customer.email ?? null,
              phone: input.customer.phone,
            },
            customData,
          },
          { sourceUrl },
        );
      } catch (e) {
        console.error("[bookings] CAPI InitiateCheckout event failed", e);
      }

      return { ok: true, orderId: created.id, orderNo: created.orderNo };
    },
  ),
);

/** Client-facing public action (single object arg; rate key is derived from IP). */
export const createPackageOrderAction = async (
  input: PackageOrderInput,
): Promise<CreateOrderResult> => runCreatePackageOrder(input);

/**
 * The public inquiry form's server endpoint (services listings). Same shape as
 * the package action, plus the per-listing formConfig validation: when the
 * listing's formConfig parses as a landing FormConfig, the extra answers are
 * validated with buildLeadSchema (via validateInquiryExtraFields) and only the
 * CLEANED record is stored; a listing without a usable formConfig accepts no
 * extra answers at all.
 */
const runCreateInquiryOrder = publicOrderRelay(
  withGuard(
    { public: true, rateLimit: { limit: 10, windowMs: 60_000 } },
    async (
      raw: InquiryOrderInput,
      session: Session | null,
    ): Promise<CreateOrderResult> => {
      const parsed = inquiryOrderInputSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: "validation",
          fieldErrors: inquiryFieldErrors(parsed.error.issues),
        };
      }
      const input = parsed.data;

      const listing = input.listingId ? await getListingById(input.listingId) : null;
      if (input.listingId && (!listing || listing.status !== "published")) {
        return { ok: false, error: "not_found" };
      }

      const extra = validateInquiryExtraFields(listing?.formConfig ?? null, input.extraFields);
      if (!extra.ok) {
        return { ok: false, error: "validation", fieldErrors: extra.fieldErrors };
      }

      const created = await createInquiryOrder(
        { ...input, extraFields: extra.data },
        { userId: session?.user.id ?? null },
      );

      updateTag(CACHE_TAGS.orders);
      updateTag(CACHE_TAGS.order(created.id));

      // Inquiry orders raise the same funnel event; there is no stable public
      // URL shape for service listings yet, so no event_source_url is sent.
      try {
        const customData: Record<string, unknown> = {
          orderNo: created.orderNo,
          contentType: "lead",
        };
        if (input.listingId) customData.listingId = input.listingId;
        await trackCapiEvent({
          eventName: "InitiateCheckout",
          eventId: randomUUID(),
          user: {
            email: input.email ?? null,
            phone: input.phone ?? null,
          },
          customData,
        });
      } catch (e) {
        console.error("[bookings] CAPI InitiateCheckout event failed", e);
      }

      return { ok: true, orderId: created.id, orderNo: created.orderNo };
    },
  ),
);

/** Client-facing public action (single object arg; rate key is derived from IP). */
export const createInquiryOrderAction = async (
  input: InquiryOrderInput,
): Promise<CreateOrderResult> => runCreateInquiryOrder(input);

// ==============================================================================
// ADMIN — order management
// ==============================================================================

export type OrderActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/**
 * Guard + relay wrapper for the orders admin surface: withGuard(orders.manage)
 * + GuardError → { ok:false, error }, OrderError → { ok:false, code, error }.
 * Anything else re-throws to the global error boundary.
 */
function orderAction<TInput, TOutput extends OrderActionResult>(
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "orders.manage" }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof OrderError) {
        return { ok: false, code: e.code, error: e.message } as unknown as TOutput;
      }
      throw e;
    }
  };
}

/** Expire both cache tags every admin order mutation reads through. */
function expireOrder(id: string): void {
  updateTag(CACHE_TAGS.orders);
  updateTag(CACHE_TAGS.order(id));
}

/** First failing zod issue rendered as "path: message" for the UI. Drills
 *  into union failures so the surfaced message is the member's own issue. */
function firstIssueMessage(error: z.ZodError): string {
  let issue = error.issues[0];
  while (
    issue &&
    issue.code === "invalid_union" &&
    issue.unionErrors &&
    issue.unionErrors.length > 0
  ) {
    const nested = issue.unionErrors.map((e) => e.issues[0]).find(Boolean);
    if (!nested) break;
    issue = nested;
  }
  const path = issue?.path.join(".") ?? "";
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

function parseOrderInput<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): { ok: true; data: T } | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
}

type OrderIdRef = { id: string };

const setQuoteInput = z.object({
  id: uuidSchema,
  quotedPrice: z.coerce
    .number({ invalid_type_error: "Quoted price must be a number" })
    .finite("Quoted price must be a number")
    .positive("Quoted price must be greater than zero")
    .max(1e12, "Quoted price is too large"),
});

const updateOrderStatusInput = z.object({
  id: uuidSchema,
  status: orderStatusSchema,
  note: z.string().trim().max(2000, "Note must be 2000 characters or fewer").optional(),
});

const createOrderFromLeadInput = z.object({
  leadId: uuidSchema,
  input: convertLeadOrderInputSchema,
});

/** Set the quoted price (pending/in_review → quoted) from the detail page. */
export const setQuoteAction = orderAction<unknown, OrderActionResult<OrderIdRef>>(
  async (input, session) => {
    const parsed = parseOrderInput(setQuoteInput, input);
    if (!parsed.ok) return parsed;
    await setQuote(parsed.data.id, parsed.data.quotedPrice, {
      actorId: session?.user.id ?? null,
    });
    expireOrder(parsed.data.id);
    return { ok: true, data: { id: parsed.data.id } };
  },
);

/** Move an order across the pipeline (status select / board drag). */
export const updateOrderStatusAction = orderAction<
  unknown,
  OrderActionResult<OrderIdRef>
>(async (input, session) => {
  const parsed = parseOrderInput(updateOrderStatusInput, input);
  if (!parsed.ok) return parsed;
  await transitionOrder(parsed.data.id, parsed.data.status, {
    actorId: session?.user.id ?? null,
    note: parsed.data.note ?? null,
  });
  expireOrder(parsed.data.id);
  return { ok: true, data: { id: parsed.data.id } };
});

/**
 * Convert a lead into an order (the Plan-5 replacement for the bare
 * convertLeadAction): creates the order from the admin-filled payload, links
 * it onto the lead (convertedOrderId + converted status + event) and expires
 * BOTH surfaces' tags.
 */
export const createOrderFromLeadAction = orderAction<
  unknown,
  OrderActionResult<{ id: string; orderNo: string }>
>(async (input, session) => {
  const parsed = parseOrderInput(createOrderFromLeadInput, input);
  if (!parsed.ok) return parsed;
  const order = await convertLeadToOrder(parsed.data.leadId, parsed.data.input, {
    actorId: session?.user.id ?? null,
  });
  updateTag(CACHE_TAGS.orders);
  updateTag(CACHE_TAGS.order(order.id));
  updateTag(CACHE_TAGS.leads);
  updateTag(CACHE_TAGS.lead(parsed.data.leadId));
  return { ok: true, data: { id: order.id, orderNo: order.orderNo } };
});
