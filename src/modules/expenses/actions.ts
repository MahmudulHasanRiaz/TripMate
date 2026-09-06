"use server";

/**
 * Expenses — guarded server actions.
 *
 * Surfaces:
 *   - submitExpenseAction (expenses.submit) — staff and above record expense
 *     entries; every entry lands pending.
 *   - approveExpenseAction / rejectExpenseAction (expenses.approve) — the
 *     approval gate that moves a pending entry into (or out of) the P&L.
 *   - category CRUD actions — ALSO expenses.approve, deliberately: category
 *     config (kinds drive the P&L classification) is financial reporting
 *     config, not content entry, so it sits at the approver level rather than
 *     inventing a third permission key; expenses.submit stays the lower bar
 *     for the day-to-day entry flow.
 *
 * Each action is withGuard + typed-error relay + a zod .safeParse boundary
 * (parsed.data only — raw input never reaches the service).
 *
 * NO cache tags are expired here, deliberately: expense reads (list, detail,
 * P&L, service margin) are admin-only surfaces rendered by dynamic server
 * components — there is no cached public consumer yet and CACHE_TAGS has no
 * expenses tag. When a cached surface starts reading expense data, add the
 * tag there and the matching updateTag calls here (the same contract every
 * other module's actions follow).
 *
 * The plain READ service functions (listCategories, listExpenses,
 * getExpenseDetail, getPLReport, getServiceMargin) are deliberately NOT
 * re-exported from this 'use server' file: re-exporting an async service fn
 * here would expose it as an unguarded client-callable server action.
 * Admin server components import them directly from service.ts (server-only)
 * and carry their own route-level guard — the same split every other module
 * uses.
 */

import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import {
  expenseCategoryInputSchema,
  expenseEntryInputSchema,
  uuidSchema,
} from "./validation";
import {
  ExpenseError,
  approveExpense,
  rejectExpense,
  setCategoryActive,
  softDeleteCategory,
  submitExpense,
  upsertCategory,
} from "./service";

// ==============================================================================
// Shared relay + parse helpers
// ==============================================================================

export type ExpenseActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/** Success payload for every write that produces/updates one row. */
type ExpenseIdRef = { id: string };

/**
 * Guard + relay wrapper for every expenses action: withGuard({ permission })
 * + GuardError → { ok:false, error }, ExpenseError → { ok:false, code, error }.
 * Anything else re-throws to the global error boundary (the payments
 * actions.ts contract, verbatim).
 */
function expenseAction<TInput, TOutput extends { ok: boolean }>(
  guardOpts: { permission: string },
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard(guardOpts, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof ExpenseError) {
        return { ok: false, code: e.code, error: e.message } as unknown as TOutput;
      }
      throw e;
    }
  };
}

/** First failing zod issue rendered as "path: message" for the UI. */
function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".") ?? "";
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

function parseExpenseInput<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): { ok: true; data: T } | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
}

// ==============================================================================
// Entries — submit (expenses.submit) / process (expenses.approve)
// ==============================================================================

/** Submit an expense entry (lands pending, awaiting approval). */
export const submitExpenseAction = expenseAction<unknown, ExpenseActionResult<ExpenseIdRef>>(
  { permission: "expenses.submit" },
  async (input, session) => {
    const parsed = parseExpenseInput(expenseEntryInputSchema, input);
    if (!parsed.ok) return parsed;
    const entry = await submitExpense({
      input: parsed.data,
      createdBy: session?.user.id ?? null,
    });
    return { ok: true, data: { id: entry.id } };
  },
);

const approveExpenseInput = z.object({ id: uuidSchema });

/** Approve a pending expense — it starts counting in the P&L. */
export const approveExpenseAction = expenseAction<unknown, ExpenseActionResult<ExpenseIdRef>>(
  { permission: "expenses.approve" },
  async (input, session) => {
    const parsed = parseExpenseInput(approveExpenseInput, input);
    if (!parsed.ok) return parsed;
    const entry = await approveExpense(parsed.data.id, {
      approvedBy: session?.user.id ?? null,
    });
    return { ok: true, data: { id: entry.id } };
  },
);

const rejectExpenseInput = z.object({
  id: uuidSchema,
  /** Accepted for boundary symmetry, not persisted in v1 (expenses has no
   *  note column — see the service module header, choice 4). */
  note: z.string().trim().max(2000, "Note must be 2000 characters or fewer").optional(),
});

/** Reject a pending expense. */
export const rejectExpenseAction = expenseAction<unknown, ExpenseActionResult<ExpenseIdRef>>(
  { permission: "expenses.approve" },
  async (input, session) => {
    const parsed = parseExpenseInput(rejectExpenseInput, input);
    if (!parsed.ok) return parsed;
    const entry = await rejectExpense(parsed.data.id, {
      approvedBy: session?.user.id ?? null,
      note: parsed.data.note ?? null,
    });
    return { ok: true, data: { id: entry.id } };
  },
);

// ==============================================================================
// Category config (expenses.approve — see the module header for why)
// ==============================================================================

/** Create or update an expense category. */
export const upsertExpenseCategoryAction = expenseAction<
  unknown,
  ExpenseActionResult<ExpenseIdRef>
>({ permission: "expenses.approve" }, async (input) => {
  const parsed = parseExpenseInput(expenseCategoryInputSchema, input);
  if (!parsed.ok) return parsed;
  const category = await upsertCategory(parsed.data);
  return { ok: true, data: { id: category.id } };
});

const setCategoryActiveInput = z.object({
  id: uuidSchema,
  isActive: z.boolean(),
});

/** Activate / deactivate a category (deactivation runs the IN_USE guard). */
export const setExpenseCategoryActiveAction = expenseAction<
  unknown,
  ExpenseActionResult<ExpenseIdRef>
>({ permission: "expenses.approve" }, async (input) => {
  const parsed = parseExpenseInput(setCategoryActiveInput, input);
  if (!parsed.ok) return parsed;
  const category = await setCategoryActive(parsed.data.id, parsed.data.isActive);
  return { ok: true, data: { id: category.id } };
});

const categoryByIdInput = z.object({ id: uuidSchema });

/** Soft-delete (deactivate) an unreferenced category. */
export const softDeleteExpenseCategoryAction = expenseAction<
  unknown,
  ExpenseActionResult<ExpenseIdRef>
>({ permission: "expenses.approve" }, async (input) => {
  const parsed = parseExpenseInput(categoryByIdInput, input);
  if (!parsed.ok) return parsed;
  const ok = await softDeleteCategory(parsed.data.id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Expense category not found." };
  }
  return { ok: true, data: { id: parsed.data.id } };
});
