import "server-only";

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { isUniqueViolation } from "@/lib/db-utils";
import { destinations, serviceCategories } from "./schema";
import { visaTypes, visaServices } from "./visa-schema";
import { serviceOptions } from "./service-options-schema";
import { leads } from "@/modules/leads/schema";
import type {
  VisaTypeInput,
  VisaServiceInput,
  ServiceOptionInput,
  VisaInquiryInput,
} from "./visa-validation";

export class VisaCatalogError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "SLUG_CONFLICT" | "INVALID_REFERENCE" | "IN_USE",
    message: string,
  ) {
    super(message);
    this.name = "VisaCatalogError";
  }
}

// ----------------------------------------------------------------------------
// Visa Types Service
// ----------------------------------------------------------------------------

export type VisaType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function listVisaTypes(activeOnly = false): Promise<VisaType[]> {
  return db
    .select()
    .from(visaTypes)
    .where(activeOnly ? eq(visaTypes.isActive, true) : undefined)
    .orderBy(asc(visaTypes.sortOrder), asc(visaTypes.name));
}

export async function getVisaTypeById(id: string): Promise<VisaType | null> {
  const [found] = await db.select().from(visaTypes).where(eq(visaTypes.id, id)).limit(1);
  return found ?? null;
}

export async function upsertVisaType(input: VisaTypeInput): Promise<VisaType> {
  const values = {
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    icon: input.icon ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    updatedAt: new Date(),
  };

  try {
    if (input.id) {
      const [updated] = await db
        .update(visaTypes)
        .set(values)
        .where(eq(visaTypes.id, input.id))
        .returning();
      if (!updated) {
        throw new VisaCatalogError("NOT_FOUND", `Visa type ${input.id} not found.`);
      }
      return updated;
    }

    const [created] = await db.insert(visaTypes).values(values).returning();
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new VisaCatalogError(
        "SLUG_CONFLICT",
        `A visa type with slug "${input.slug}" already exists.`,
      );
    }
    throw err;
  }
}

export async function deleteVisaType(id: string): Promise<boolean> {
  const [referencing] = await db
    .select({ id: visaServices.id })
    .from(visaServices)
    .where(eq(visaServices.visaTypeId, id))
    .limit(1);
  if (referencing) {
    throw new VisaCatalogError(
      "IN_USE",
      "Cannot delete this visa type because active visa services reference it.",
    );
  }

  const [deleted] = await db.delete(visaTypes).where(eq(visaTypes.id, id)).returning();
  return Boolean(deleted);
}

// ----------------------------------------------------------------------------
// Visa Services (Offerings) Service
// ----------------------------------------------------------------------------

export type VisaServiceWithRefs = {
  id: string;
  destinationId: string;
  visaTypeId: string;
  destination: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
  };
  visaType: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
  title: string;
  slug: string;
  price: number;
  costPrice: number | null;
  grossProfit: number | null;
  marginPercent: number | null;
  processingTime: string | null;
  validity: string | null;
  stayDuration: string | null;
  requirements: string[];
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  seo: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listVisaServices(filters?: {
  destinationId?: string;
  visaTypeId?: string;
  activeOnly?: boolean;
  search?: string;
}): Promise<VisaServiceWithRefs[]> {
  const conditions = [];

  if (filters?.activeOnly) {
    conditions.push(eq(visaServices.isActive, true));
  }
  if (filters?.destinationId) {
    conditions.push(eq(visaServices.destinationId, filters.destinationId));
  }
  if (filters?.visaTypeId) {
    conditions.push(eq(visaServices.visaTypeId, filters.visaTypeId));
  }
  if (filters?.search?.trim()) {
    conditions.push(
      or(
        ilike(visaServices.title, `%${filters.search.trim()}%`),
        ilike(destinations.name, `%${filters.search.trim()}%`),
      ),
    );
  }

  const rows = await db
    .select({
      visa: visaServices,
      dest: {
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
        image: destinations.image,
      },
      vType: {
        id: visaTypes.id,
        name: visaTypes.name,
        slug: visaTypes.slug,
        icon: visaTypes.icon,
      },
    })
    .from(visaServices)
    .innerJoin(destinations, eq(visaServices.destinationId, destinations.id))
    .innerJoin(visaTypes, eq(visaServices.visaTypeId, visaTypes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(visaServices.sortOrder), asc(visaServices.title));

  return rows.map((r) => {
    const priceNum = Number(r.visa.price);
    const costNum = r.visa.costPrice ? Number(r.visa.costPrice) : null;
    const grossProfit = costNum !== null ? priceNum - costNum : null;
    const marginPercent =
      costNum !== null && priceNum > 0 ? (grossProfit! / priceNum) * 100 : null;

    const reqs = Array.isArray(r.visa.requirements)
      ? (r.visa.requirements.filter((item) => typeof item === "string") as string[])
      : [];

    return {
      id: r.visa.id,
      destinationId: r.visa.destinationId,
      visaTypeId: r.visa.visaTypeId,
      destination: r.dest,
      visaType: r.vType,
      title: r.visa.title,
      slug: r.visa.slug,
      price: priceNum,
      costPrice: costNum,
      grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
      marginPercent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
      processingTime: r.visa.processingTime,
      validity: r.visa.validity,
      stayDuration: r.visa.stayDuration,
      requirements: reqs,
      description: r.visa.description,
      sortOrder: r.visa.sortOrder,
      isActive: r.visa.isActive,
      seo: r.visa.seo as Record<string, unknown> | null,
      createdAt: r.visa.createdAt,
      updatedAt: r.visa.updatedAt,
    };
  });
}

export async function getVisaServiceById(id: string): Promise<VisaServiceWithRefs | null> {
  const [row] = await db
    .select({
      visa: visaServices,
      dest: {
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
        image: destinations.image,
      },
      vType: {
        id: visaTypes.id,
        name: visaTypes.name,
        slug: visaTypes.slug,
        icon: visaTypes.icon,
      },
    })
    .from(visaServices)
    .innerJoin(destinations, eq(visaServices.destinationId, destinations.id))
    .innerJoin(visaTypes, eq(visaServices.visaTypeId, visaTypes.id))
    .where(eq(visaServices.id, id))
    .limit(1);

  if (!row) return null;

  const priceNum = Number(row.visa.price);
  const costNum = row.visa.costPrice ? Number(row.visa.costPrice) : null;
  const grossProfit = costNum !== null ? priceNum - costNum : null;
  const marginPercent = costNum !== null && priceNum > 0 ? (grossProfit! / priceNum) * 100 : null;

  const reqs = Array.isArray(row.visa.requirements)
    ? (row.visa.requirements.filter((item) => typeof item === "string") as string[])
    : [];

  return {
    id: row.visa.id,
    destinationId: row.visa.destinationId,
    visaTypeId: row.visa.visaTypeId,
    destination: row.dest,
    visaType: row.vType,
    title: row.visa.title,
    slug: row.visa.slug,
    price: priceNum,
    costPrice: costNum,
    grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
    marginPercent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
    processingTime: row.visa.processingTime,
    validity: row.visa.validity,
    stayDuration: row.visa.stayDuration,
    requirements: reqs,
    description: row.visa.description,
    sortOrder: row.visa.sortOrder,
    isActive: row.visa.isActive,
    seo: row.visa.seo as Record<string, unknown> | null,
    createdAt: row.visa.createdAt,
    updatedAt: row.visa.updatedAt,
  };
}

export async function getVisaServiceBySlug(slug: string): Promise<VisaServiceWithRefs | null> {
  const [row] = await db
    .select({
      visa: visaServices,
      dest: {
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
        image: destinations.image,
      },
      vType: {
        id: visaTypes.id,
        name: visaTypes.name,
        slug: visaTypes.slug,
        icon: visaTypes.icon,
      },
    })
    .from(visaServices)
    .innerJoin(destinations, eq(visaServices.destinationId, destinations.id))
    .innerJoin(visaTypes, eq(visaServices.visaTypeId, visaTypes.id))
    .where(eq(visaServices.slug, slug))
    .limit(1);

  if (!row) return null;

  const priceNum = Number(row.visa.price);
  const costNum = row.visa.costPrice ? Number(row.visa.costPrice) : null;
  const grossProfit = costNum !== null ? priceNum - costNum : null;
  const marginPercent = costNum !== null && priceNum > 0 ? (grossProfit! / priceNum) * 100 : null;

  const reqs = Array.isArray(row.visa.requirements)
    ? (row.visa.requirements.filter((item) => typeof item === "string") as string[])
    : [];

  return {
    id: row.visa.id,
    destinationId: row.visa.destinationId,
    visaTypeId: row.visa.visaTypeId,
    destination: row.dest,
    visaType: row.vType,
    title: row.visa.title,
    slug: row.visa.slug,
    price: priceNum,
    costPrice: costNum,
    grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
    marginPercent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
    processingTime: row.visa.processingTime,
    validity: row.visa.validity,
    stayDuration: row.visa.stayDuration,
    requirements: reqs,
    description: row.visa.description,
    sortOrder: row.visa.sortOrder,
    isActive: row.visa.isActive,
    seo: row.visa.seo as Record<string, unknown> | null,
    createdAt: row.visa.createdAt,
    updatedAt: row.visa.updatedAt,
  };
}

export async function upsertVisaService(
  input: VisaServiceInput,
): Promise<VisaServiceWithRefs> {
  const values = {
    destinationId: input.destinationId,
    visaTypeId: input.visaTypeId,
    title: input.title,
    slug: input.slug,
    price: input.price.toFixed(2),
    costPrice: input.costPrice ? input.costPrice.toFixed(2) : null,
    processingTime: input.processingTime ?? null,
    validity: input.validity ?? null,
    stayDuration: input.stayDuration ?? null,
    requirements: input.requirements ?? [],
    description: input.description ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    seo: input.seo ?? null,
    updatedAt: new Date(),
  };

  try {
    let targetId = input.id;
    if (targetId) {
      const [updated] = await db
        .update(visaServices)
        .set(values)
        .where(eq(visaServices.id, targetId))
        .returning({ id: visaServices.id });
      if (!updated) {
        throw new VisaCatalogError("NOT_FOUND", `Visa service ${targetId} not found.`);
      }
    } else {
      const [created] = await db
        .insert(visaServices)
        .values(values)
        .returning({ id: visaServices.id });
      targetId = created.id;
    }

    const saved = await getVisaServiceById(targetId);
    if (!saved) {
      throw new VisaCatalogError("NOT_FOUND", "Could not load visa service after save.");
    }
    return saved;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new VisaCatalogError(
        "SLUG_CONFLICT",
        `A visa service with slug "${input.slug}" already exists.`,
      );
    }
    throw err;
  }
}

export async function deleteVisaService(id: string): Promise<boolean> {
  const [deleted] = await db.delete(visaServices).where(eq(visaServices.id, id)).returning();
  return Boolean(deleted);
}

// ----------------------------------------------------------------------------
// Service Options (Passport processing tiers, etc.)
// ----------------------------------------------------------------------------

export type ServiceOptionWithRef = {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  title: string;
  slug: string;
  duration: string | null;
  price: number;
  costPrice: number | null;
  grossProfit: number | null;
  marginPercent: number | null;
  deliveryTime: string | null;
  requirements: string[];
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  seo: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listServiceOptions(filters?: {
  categoryId?: string;
  activeOnly?: boolean;
  search?: string;
}): Promise<ServiceOptionWithRef[]> {
  const conditions = [];

  if (filters?.activeOnly) {
    conditions.push(eq(serviceOptions.isActive, true));
  }
  if (filters?.categoryId) {
    conditions.push(eq(serviceOptions.categoryId, filters.categoryId));
  }
  if (filters?.search?.trim()) {
    conditions.push(ilike(serviceOptions.title, `%${filters.search.trim()}%`));
  }

  const rows = await db
    .select({
      opt: serviceOptions,
      cat: {
        id: serviceCategories.id,
        name: serviceCategories.name,
        slug: serviceCategories.slug,
      },
    })
    .from(serviceOptions)
    .innerJoin(serviceCategories, eq(serviceOptions.categoryId, serviceCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(serviceOptions.sortOrder), asc(serviceOptions.title));

  return rows.map((r) => {
    const priceNum = Number(r.opt.price);
    const costNum = r.opt.costPrice ? Number(r.opt.costPrice) : null;
    const grossProfit = costNum !== null ? priceNum - costNum : null;
    const marginPercent =
      costNum !== null && priceNum > 0 ? (grossProfit! / priceNum) * 100 : null;

    const reqs = Array.isArray(r.opt.requirements)
      ? (r.opt.requirements.filter((item) => typeof item === "string") as string[])
      : [];

    return {
      id: r.opt.id,
      categoryId: r.opt.categoryId,
      category: r.cat,
      title: r.opt.title,
      slug: r.opt.slug,
      duration: r.opt.duration,
      price: priceNum,
      costPrice: costNum,
      grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
      marginPercent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
      deliveryTime: r.opt.deliveryTime,
      requirements: reqs,
      description: r.opt.description,
      sortOrder: r.opt.sortOrder,
      isActive: r.opt.isActive,
      seo: r.opt.seo as Record<string, unknown> | null,
      createdAt: r.opt.createdAt,
      updatedAt: r.opt.updatedAt,
    };
  });
}

export async function getServiceOptionById(id: string): Promise<ServiceOptionWithRef | null> {
  const [row] = await db
    .select({
      opt: serviceOptions,
      cat: {
        id: serviceCategories.id,
        name: serviceCategories.name,
        slug: serviceCategories.slug,
      },
    })
    .from(serviceOptions)
    .innerJoin(serviceCategories, eq(serviceOptions.categoryId, serviceCategories.id))
    .where(eq(serviceOptions.id, id))
    .limit(1);

  if (!row) return null;

  const priceNum = Number(row.opt.price);
  const costNum = row.opt.costPrice ? Number(row.opt.costPrice) : null;
  const grossProfit = costNum !== null ? priceNum - costNum : null;
  const marginPercent = costNum !== null && priceNum > 0 ? (grossProfit! / priceNum) * 100 : null;

  const reqs = Array.isArray(row.opt.requirements)
    ? (row.opt.requirements.filter((item) => typeof item === "string") as string[])
    : [];

  return {
    id: row.opt.id,
    categoryId: row.opt.categoryId,
    category: row.cat,
    title: row.opt.title,
    slug: row.opt.slug,
    duration: row.opt.duration,
    price: priceNum,
    costPrice: costNum,
    grossProfit: grossProfit !== null ? Math.round(grossProfit * 100) / 100 : null,
    marginPercent: marginPercent !== null ? Math.round(marginPercent * 10) / 10 : null,
    deliveryTime: row.opt.deliveryTime,
    requirements: reqs,
    description: row.opt.description,
    sortOrder: row.opt.sortOrder,
    isActive: row.opt.isActive,
    seo: row.opt.seo as Record<string, unknown> | null,
    createdAt: row.opt.createdAt,
    updatedAt: row.opt.updatedAt,
  };
}

export async function upsertServiceOption(
  input: ServiceOptionInput,
): Promise<ServiceOptionWithRef> {
  const values = {
    categoryId: input.categoryId,
    title: input.title,
    slug: input.slug,
    duration: input.duration ?? null,
    price: input.price.toFixed(2),
    costPrice: input.costPrice ? input.costPrice.toFixed(2) : null,
    deliveryTime: input.deliveryTime ?? null,
    requirements: input.requirements ?? [],
    description: input.description ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    seo: input.seo ?? null,
    updatedAt: new Date(),
  };

  try {
    let targetId = input.id;
    if (targetId) {
      const [updated] = await db
        .update(serviceOptions)
        .set(values)
        .where(eq(serviceOptions.id, targetId))
        .returning({ id: serviceOptions.id });
      if (!updated) {
        throw new VisaCatalogError("NOT_FOUND", `Service option ${targetId} not found.`);
      }
    } else {
      const [created] = await db
        .insert(serviceOptions)
        .values(values)
        .returning({ id: serviceOptions.id });
      targetId = created.id;
    }

    const saved = await getServiceOptionById(targetId);
    if (!saved) {
      throw new VisaCatalogError("NOT_FOUND", "Could not load service option after save.");
    }
    return saved;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new VisaCatalogError(
        "SLUG_CONFLICT",
        `A service option with slug "${input.slug}" already exists.`,
      );
    }
    throw err;
  }
}

export async function deleteServiceOption(id: string): Promise<boolean> {
  const [deleted] = await db.delete(serviceOptions).where(eq(serviceOptions.id, id)).returning();
  return Boolean(deleted);
}

// ----------------------------------------------------------------------------
// Customer Inquiries
// ----------------------------------------------------------------------------

export async function recordVisaInquiry(
  input: VisaInquiryInput,
): Promise<{ id: string; referenceNo: string }> {
  const visa = await getVisaServiceById(input.visaServiceId);
  const now = new Date();
  const refCode = `VI-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const [lead] = await db
    .insert(leads)
    .values({
      source: "organic",
      name: input.fullName,
      email: input.email || null,
      phone: input.phone,
      message: input.message || null,
      formData: {
        referenceNo: refCode,
        visaServiceId: input.visaServiceId,
        visaTitle: visa ? visa.title : "Custom Visa Request",
        destination: visa ? visa.destination.name : "Unspecified",
        travelersCount: input.travelersCount,
        passportNo: input.passportNo || null,
        targetTravelDate: input.targetTravelDate || null,
      },
      status: "new",
      notes: `Direct visa application inquiry submitted via portal for ${visa ? visa.title : "Visa"}. Reference: ${refCode}`,
    })
    .returning({ id: leads.id });

  return {
    id: lead.id,
    referenceNo: refCode,
  };
}
