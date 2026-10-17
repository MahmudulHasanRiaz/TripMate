"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-helpers";
import {
  createTestimonial,
  deleteTestimonial,
  toggleTestimonialFeatured,
  toggleTestimonialPublished,
  updateTestimonial,
} from "./testimonials-service";
import { testimonialInputSchema } from "./testimonials-validation";
import { db } from "@/db/client";
import { testimonials } from "./testimonials-schema";
import { eq } from "drizzle-orm";

export async function createTestimonialAction(rawInput: unknown) {
  try {
    await requirePermission("content.manage");
    const parsed = testimonialInputSchema.parse(rawInput);
    const item = await createTestimonial(parsed);
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: true, data: item };
  } catch (err) {
    console.error("[createTestimonialAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create testimonial" };
  }
}

export async function updateTestimonialAction(id: string, rawInput: unknown) {
  try {
    await requirePermission("content.manage");
    const parsed = testimonialInputSchema.parse(rawInput);
    const item = await updateTestimonial(id, parsed);
    if (!item) return { ok: false, error: "Testimonial not found" };
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: true, data: item };
  } catch (err) {
    console.error("[updateTestimonialAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update testimonial" };
  }
}

export async function deleteTestimonialAction(id: string) {
  try {
    await requirePermission("content.manage");
    const success = await deleteTestimonial(id);
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: success };
  } catch (err) {
    console.error("[deleteTestimonialAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete testimonial" };
  }
}

export async function toggleTestimonialPublishedAction(id: string, isPublished: boolean) {
  try {
    await requirePermission("content.manage");
    const success = await toggleTestimonialPublished(id, isPublished);
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: success };
  } catch (err) {
    console.error("[toggleTestimonialPublishedAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to toggle status" };
  }
}

export async function toggleTestimonialFeaturedAction(id: string, featured: boolean) {
  try {
    await requirePermission("content.manage");
    const success = await toggleTestimonialFeatured(id, featured);
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: success };
  } catch (err) {
    console.error("[toggleTestimonialFeaturedAction]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to toggle featured" };
  }
}

export async function reorderTestimonialsAction(orderedIds: string[]) {
  try {
    await requirePermission("content.manage");
    await Promise.all(
      orderedIds.map((id, index) =>
        db
          .update(testimonials)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(testimonials.id, id)),
      ),
    );
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    console.error("[reorderTestimonialsAction]", err);
    return { ok: false, error: "Failed to reorder testimonials" };
  }
}
