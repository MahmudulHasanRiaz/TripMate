"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { GuardError, withGuard } from "@/lib/guard";
import {
  VisaCatalogError,
  upsertVisaType,
  deleteVisaType,
  upsertVisaService,
  deleteVisaService,
  upsertServiceOption,
  deleteServiceOption,
  recordVisaInquiry,
  type VisaType,
  type VisaServiceWithRefs,
  type ServiceOptionWithRef,
} from "./visa-service";
import {
  visaTypeInputSchema,
  visaServiceInputSchema,
  serviceOptionInputSchema,
  visaInquiryInputSchema,
} from "./visa-validation";
import { parseActionId, type ActionResult } from "./action-utils";

function revalidateVisaData(): void {
  updateTag(CACHE_TAGS.listings);
  revalidatePath("/admin/catalog/visa-services");
  revalidatePath("/admin/catalog/service-options");
  revalidatePath("/visa");
  revalidatePath("/");
}

// ----------------------------------------------------------------------------
// Visa Types Actions
// ----------------------------------------------------------------------------

export async function saveVisaTypeAction(
  rawInput: unknown,
): Promise<ActionResult<{ type: VisaType }>> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (input: unknown): Promise<ActionResult<{ type: VisaType }>> => {
      const parsed = visaTypeInputSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return { ok: false, code: "VALIDATION", error: issue.message };
      }
      const type = await upsertVisaType(parsed.data);
      revalidateVisaData();
      return { ok: true, data: { type } };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

export async function deleteVisaTypeAction(rawId: string): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (id: string): Promise<ActionResult> => {
      const cleanId = parseActionId(id);
      if (!cleanId) return { ok: false, code: "VALIDATION", error: "Invalid id" };
      const deleted = await deleteVisaType(cleanId);
      if (!deleted) return { ok: false, code: "NOT_FOUND", error: "Visa type not found" };
      revalidateVisaData();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawId);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Visa Services (Offerings) Actions
// ----------------------------------------------------------------------------

export async function saveVisaServiceAction(
  rawInput: unknown,
): Promise<ActionResult<{ service: VisaServiceWithRefs }>> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (input: unknown): Promise<ActionResult<{ service: VisaServiceWithRefs }>> => {
      const parsed = visaServiceInputSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.join(".");
        return {
          ok: false,
          code: "VALIDATION",
          error: field ? `${field}: ${issue.message}` : issue.message,
        };
      }
      const service = await upsertVisaService(parsed.data);
      revalidateVisaData();
      return { ok: true, data: { service } };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

export async function deleteVisaServiceAction(rawId: string): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (id: string): Promise<ActionResult> => {
      const cleanId = parseActionId(id);
      if (!cleanId) return { ok: false, code: "VALIDATION", error: "Invalid id" };
      const deleted = await deleteVisaService(cleanId);
      if (!deleted) return { ok: false, code: "NOT_FOUND", error: "Visa service not found" };
      revalidateVisaData();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawId);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Service Options (Passport processing tiers, etc.) Actions
// ----------------------------------------------------------------------------

export async function saveServiceOptionAction(
  rawInput: unknown,
): Promise<ActionResult<{ option: ServiceOptionWithRef }>> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (input: unknown): Promise<ActionResult<{ option: ServiceOptionWithRef }>> => {
      const parsed = serviceOptionInputSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.join(".");
        return {
          ok: false,
          code: "VALIDATION",
          error: field ? `${field}: ${issue.message}` : issue.message,
        };
      }
      const option = await upsertServiceOption(parsed.data);
      revalidateVisaData();
      return { ok: true, data: { option } };
    },
  );

  try {
    return await guarded(rawInput);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

export async function deleteServiceOptionAction(rawId: string): Promise<ActionResult> {
  const guarded = withGuard(
    { permission: "catalog.manage" },
    async (id: string): Promise<ActionResult> => {
      const cleanId = parseActionId(id);
      if (!cleanId) return { ok: false, code: "VALIDATION", error: "Invalid id" };
      const deleted = await deleteServiceOption(cleanId);
      if (!deleted) return { ok: false, code: "NOT_FOUND", error: "Service option not found" };
      revalidateVisaData();
      return { ok: true };
    },
  );

  try {
    return await guarded(rawId);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: err.code };
    }
    if (err instanceof VisaCatalogError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Public Customer Visa Inquiry Action
// ----------------------------------------------------------------------------

export async function submitVisaInquiryAction(
  rawInput: unknown,
): Promise<ActionResult<{ referenceNo: string }>> {
  try {
    const parsed = visaInquiryInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, code: "VALIDATION", error: issue.message };
    }
    const result = await recordVisaInquiry(parsed.data);
    return { ok: true, data: { referenceNo: result.referenceNo } };
  } catch {
    return {
      ok: false,
      code: "SERVER_ERROR",
      error: "Unable to submit inquiry at this moment. Please call our hotline.",
    };
  }
}
