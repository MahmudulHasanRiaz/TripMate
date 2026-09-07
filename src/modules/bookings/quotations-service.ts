import "server-only";

import { and, desc, eq, ilike, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { escapeLike, isUniqueViolation } from "@/lib/db-utils";
import { quotations, quotationItems } from "./quotations-schema";
import { orders, orderStatusEvents } from "./schema";
import { markLeadConverted } from "@/modules/leads/service";
import {
  formatQuoteNo,
  type QuotationInput,
  type QuotationStatus,
  type QuotationStatusInput,
  type ConvertQuotationInput,
} from "./quotations-validation";

export { formatQuoteNo };

export class QuotationError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "ALREADY_CONVERTED"
      | "INVALID_STATE"
      | "QUOTE_NO_CONFLICT"
      | "VALIDATION",
    message: string,
  ) {
    super(message);
    this.name = "QuotationError";
  }
}

async function nextQuoteNoForYear(year: number): Promise<string> {
  const prefix = `QT-${year}-`;
  const [row] = await db
    .select({
      maxNo: sql<string | null>`max(${quotations.quoteNo})`,
    })
    .from(quotations)
    .where(like(quotations.quoteNo, `${prefix}%`));

  let nextSeq = 1;
  if (row?.maxNo) {
    const tail = row.maxNo.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }
  return formatQuoteNo(nextSeq, year);
}

export type QuotationListItem = {
  id: string;
  quoteNo: string;
  leadId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalPrice: number;
  totalCost: number;
  grossProfit: number;
  status: QuotationStatus;
  validUntil: Date | null;
  convertedOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemsCount: number;
};

export type QuotationDetail = {
  id: string;
  quoteNo: string;
  leadId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  totalPrice: number;
  totalCost: number;
  grossProfit: number;
  notes: string | null;
  status: QuotationStatus;
  validUntil: Date | null;
  convertedOrderId: string | null;
  convertedOrderNo?: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    totalCost: number;
  }[];
};

export async function listQuotations(params: {
  status?: QuotationStatus;
  search?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<{ items: QuotationListItem[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(quotations.status, params.status));
  }

  if (params.search?.trim()) {
    const pattern = `%${escapeLike(params.search.trim())}%`;
    conditions.push(
      or(
        ilike(quotations.quoteNo, pattern),
        ilike(quotations.customerName, pattern),
        ilike(quotations.customerPhone, pattern),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotations)
    .where(whereClause);

  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: quotations.id,
      quoteNo: quotations.quoteNo,
      leadId: quotations.leadId,
      customerName: quotations.customerName,
      customerPhone: quotations.customerPhone,
      customerEmail: quotations.customerEmail,
      totalPrice: quotations.totalPrice,
      totalCost: quotations.totalCost,
      grossProfit: quotations.grossProfit,
      status: quotations.status,
      validUntil: quotations.validUntil,
      convertedOrderId: quotations.convertedOrderId,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      itemsCount: sql<number>`(select count(*)::int from ${quotationItems} where ${quotationItems.quotationId} = ${quotations.id})`,
    })
    .from(quotations)
    .where(whereClause)
    .orderBy(desc(quotations.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    total,
    items: rows.map((r) => ({
      ...r,
      totalPrice: Number(r.totalPrice),
      totalCost: Number(r.totalCost ?? 0),
      grossProfit: Number(r.grossProfit ?? 0),
      itemsCount: Number(r.itemsCount ?? 0),
    })),
  };
}

export async function getQuotationById(id: string): Promise<QuotationDetail | null> {
  const [row] = await db
    .select({
      id: quotations.id,
      quoteNo: quotations.quoteNo,
      leadId: quotations.leadId,
      customerName: quotations.customerName,
      customerPhone: quotations.customerPhone,
      customerEmail: quotations.customerEmail,
      totalPrice: quotations.totalPrice,
      totalCost: quotations.totalCost,
      grossProfit: quotations.grossProfit,
      notes: quotations.notes,
      status: quotations.status,
      validUntil: quotations.validUntil,
      convertedOrderId: quotations.convertedOrderId,
      createdBy: quotations.createdBy,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
      convertedOrderNo: orders.orderNo,
    })
    .from(quotations)
    .leftJoin(orders, eq(quotations.convertedOrderId, orders.id))
    .where(eq(quotations.id, id))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select({
      id: quotationItems.id,
      description: quotationItems.description,
      quantity: quotationItems.quantity,
      unitPrice: quotationItems.unitPrice,
      unitCost: quotationItems.unitCost,
      totalPrice: quotationItems.totalPrice,
      totalCost: quotationItems.totalCost,
    })
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(quotationItems.createdAt);

  return {
    ...row,
    totalPrice: Number(row.totalPrice),
    totalCost: Number(row.totalCost ?? 0),
    grossProfit: Number(row.grossProfit ?? 0),
    items: items.map((it) => ({
      ...it,
      unitPrice: Number(it.unitPrice),
      unitCost: Number(it.unitCost ?? 0),
      totalPrice: Number(it.totalPrice),
      totalCost: Number(it.totalCost ?? 0),
    })),
  };
}

export async function upsertQuotation(
  input: QuotationInput,
  actorId?: string,
): Promise<{ id: string; quoteNo: string }> {
  // Calculate totals
  let totalPrice = 0;
  let totalCost = 0;

  const calculatedItems = input.items.map((item) => {
    const qty = item.quantity;
    const itemTotal = Math.round(qty * item.unitPrice * 100) / 100;
    const itemCostTotal = Math.round(qty * (item.unitCost ?? 0) * 100) / 100;
    totalPrice += itemTotal;
    totalCost += itemCostTotal;
    return {
      description: item.description,
      quantity: qty,
      unitPrice: item.unitPrice.toFixed(2),
      unitCost: (item.unitCost ?? 0).toFixed(2),
      totalPrice: itemTotal.toFixed(2),
      totalCost: itemCostTotal.toFixed(2),
    };
  });

  const grossProfit = Math.round((totalPrice - totalCost) * 100) / 100;

  if (input.id) {
    // Update existing
    const existing = await getQuotationById(input.id);
    if (!existing) {
      throw new QuotationError("NOT_FOUND", "Quotation not found");
    }
    if (existing.status === "converted") {
      throw new QuotationError(
        "ALREADY_CONVERTED",
        "Cannot edit a quotation that has already been converted to an order",
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(quotations)
        .set({
          leadId: input.leadId ?? null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail || null,
          totalPrice: totalPrice.toFixed(2),
          totalCost: totalCost.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          notes: input.notes ?? null,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, input.id!));

      // Replace items
      await tx
        .delete(quotationItems)
        .where(eq(quotationItems.quotationId, input.id!));

      for (const item of calculatedItems) {
        await tx.insert(quotationItems).values({
          quotationId: input.id!,
          ...item,
        });
      }
    });

    return { id: input.id, quoteNo: existing.quoteNo };
  }

  // Create new
  const now = new Date();
  const year = now.getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const quoteNo = await nextQuoteNoForYear(year);
    try {
      const [inserted] = await db.transaction(async (tx) => {
        const [q] = await tx
          .insert(quotations)
          .values({
            quoteNo,
            leadId: input.leadId ?? null,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerEmail: input.customerEmail || null,
            totalPrice: totalPrice.toFixed(2),
            totalCost: totalCost.toFixed(2),
            grossProfit: grossProfit.toFixed(2),
            notes: input.notes ?? null,
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
            status: "draft",
            createdBy: actorId ?? null,
          })
          .returning({ id: quotations.id, quoteNo: quotations.quoteNo });

        for (const item of calculatedItems) {
          await tx.insert(quotationItems).values({
            quotationId: q.id,
            ...item,
          });
        }

        return [q];
      });

      return inserted;
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }

  throw new QuotationError("QUOTE_NO_CONFLICT", "Failed to generate unique quote number");
}

export async function updateQuotationStatus(input: QuotationStatusInput): Promise<void> {
  const quote = await getQuotationById(input.id);
  if (!quote) throw new QuotationError("NOT_FOUND", "Quotation not found");

  if (quote.status === "converted" && input.status !== "converted") {
    throw new QuotationError(
      "ALREADY_CONVERTED",
      "Cannot change status of an already converted quotation",
    );
  }

  await db
    .update(quotations)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, input.id));
}

export async function convertQuotationToOrder(
  input: ConvertQuotationInput,
  actorId?: string,
): Promise<{ orderId: string; orderNo: string }> {
  const quote = await getQuotationById(input.quotationId);
  if (!quote) throw new QuotationError("NOT_FOUND", "Quotation not found");

  if (quote.status === "converted" || quote.convertedOrderId) {
    throw new QuotationError(
      "ALREADY_CONVERTED",
      "This quotation has already been converted to an order",
    );
  }

  // Allocate order number
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const [maxRow] = await db
    .select({ maxNo: sql<string | null>`max(${orders.orderNo})` })
    .from(orders)
    .where(like(orders.orderNo, `${prefix}%`));

  let nextSeq = 1;
  if (maxRow?.maxNo) {
    const tail = maxRow.maxNo.slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
  }
  const orderNo = `ORD-${year}-${String(nextSeq).padStart(4, "0")}`;

  const result = await db.transaction(async (tx) => {
    // 1. Create order
    const [order] = await tx
      .insert(orders)
      .values({
        orderNo,
        type: "inquiry",
        status: "confirmed",
        source: "lead_conversion",
        customerSnapshot: {
          name: quote.customerName,
          phone: quote.customerPhone,
          email: quote.customerEmail ?? "",
        },
        listingSnapshot: {
          title: `Quotation ${quote.quoteNo}`,
          quoteNo: quote.quoteNo,
          items: quote.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            unitCost: i.unitCost,
            totalPrice: i.totalPrice,
          })),
        },
        quotedPrice: quote.totalPrice.toFixed(2),
        finalPrice: quote.totalPrice.toFixed(2),
        costPrice: quote.totalCost.toFixed(2),
        grossProfit: quote.grossProfit.toFixed(2),
        paidAmount: "0",
        paymentStatus: "unpaid",
        leadId: quote.leadId,
        specialRequests: quote.notes ? `${quote.notes}${input.note ? `\n\nConversion note: ${input.note}` : ""}` : input.note ?? null,
        createdBy: actorId ?? null,
      })
      .returning({ id: orders.id, orderNo: orders.orderNo });

    // 2. Add status event
    await tx.insert(orderStatusEvents).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: "confirmed",
      note: `Converted from quotation ${quote.quoteNo}`,
      actorId: actorId ?? null,
    });

    // 3. Mark quotation converted
    await tx
      .update(quotations)
      .set({
        status: "converted",
        convertedOrderId: order.id,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id));

    // 4. If lead exists, mark it converted
    if (quote.leadId) {
      await markLeadConverted(quote.leadId, {
        convertedOrderId: order.id,
        actorId: actorId ?? null,
      });
    }

    return order;
  });

  return { orderId: result.id, orderNo: result.orderNo };
}

export async function deleteQuotation(id: string): Promise<boolean> {
  const quote = await getQuotationById(id);
  if (!quote) return false;
  if (quote.status === "converted") {
    throw new QuotationError("ALREADY_CONVERTED", "Cannot delete a converted quotation");
  }

  await db.transaction(async (tx) => {
    await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    await tx.delete(quotations).where(eq(quotations.id, id));
  });

  return true;
}
