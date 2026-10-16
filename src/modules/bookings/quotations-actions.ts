"use server";

import { revalidatePath } from "next/cache";
import { GuardError, withGuard } from "@/lib/guard";
import { parseActionId, type ActionResult } from "@/modules/catalog/action-utils";
import {
  QuotationError,
  upsertQuotation,
  updateQuotationStatus,
  acceptQuotation,
  convertQuotationToOrder,
  deleteQuotation,
} from "./quotations-service";
import {
  quotationInputSchema,
  quotationStatusInputSchema,
  convertQuotationInputSchema,
} from "./quotations-validation";

function revalidateQuotations(): void {
  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function saveQuotationAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; quoteNo: string }>> {
  const guarded = withGuard(
    { permission: "orders.manage" },
    async (input: unknown, session): Promise<ActionResult<{ id: string; quoteNo: string }>> => {
      const parsed = quotationInputSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.join(".");
        return {
          ok: false,
          code: "VALIDATION",
          error: field ? `${field}: ${issue.message}` : issue.message,
        };
      }
      const result = await upsertQuotation(parsed.data, session?.user?.id);
      revalidateQuotations();
      return { ok: true, data: result };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) return { ok: false, error: err.code };
    if (err instanceof QuotationError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}

export async function updateQuotationStatusAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "orders.manage" },
    async (input: unknown): Promise<ActionResult> => {
      const parsed = quotationStatusInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION", error: parsed.error.issues[0].message };
      }
      await updateQuotationStatus(parsed.data);
      revalidateQuotations();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) return { ok: false, error: err.code };
    if (err instanceof QuotationError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}

export async function convertQuotationToOrderAction(
  rawInput: unknown,
): Promise<ActionResult<{ orderId: string; orderNo: string }>> {
  const guarded = withGuard(
    { permission: "orders.manage" },
    async (input: unknown, session): Promise<ActionResult<{ orderId: string; orderNo: string }>> => {
      const parsed = convertQuotationInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION", error: parsed.error.issues[0].message };
      }
      const result = await convertQuotationToOrder(parsed.data, session?.user?.id);
      revalidateQuotations();
      return { ok: true, data: result };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) return { ok: false, error: err.code };
    if (err instanceof QuotationError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}

export async function deleteQuotationAction(rawId: string): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "orders.manage" },
    async (id: string): Promise<ActionResult> => {
      const cleanId = parseActionId(id);
      if (!cleanId) return { ok: false, code: "VALIDATION", error: "Invalid quotation ID" };
      const deleted = await deleteQuotation(cleanId);
      if (!deleted) return { ok: false, code: "NOT_FOUND", error: "Quotation not found" };
      revalidateQuotations();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawId);
  } catch (err) {
    if (err instanceof GuardError) return { ok: false, error: err.code };
    if (err instanceof QuotationError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}

/**
 * Accept a quotation on behalf of the customer or record the customer's own
 * acceptance (§2.7). Staff accept records the staff user in acceptedBy.
 */
export async function acceptQuotationAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "orders.manage" },
    async (input: unknown, session): Promise<ActionResult> => {
      const parsed = quotationStatusInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION", error: parsed.error.issues[0].message };
      }
      await acceptQuotation(parsed.data.id, {
        acceptedBy: "staff",
        actorId: session?.user?.id ?? null,
      });
      revalidateQuotations();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) return { ok: false, error: err.code };
    if (err instanceof QuotationError) return { ok: false, code: err.code, error: err.message };
    throw err;
  }
}
