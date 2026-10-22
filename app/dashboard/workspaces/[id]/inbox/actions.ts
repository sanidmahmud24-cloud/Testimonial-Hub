"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  setTestimonialStatus,
  setTestimonialFeatured,
  setTestimonialPublished,
  deleteTestimonial,
  NotTestimonialOwnerError,
  TestimonialNotFoundError,
} from "@/lib/testimonials/moderation";

const idSchema = z.object({ id: z.string().min(1) });

export type InboxActionResult = { ok: true } | { ok: false; error: string };

async function withId(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  return { ok: true, id: parsed.data.id };
}

export async function approveTestimonialAction(
  formData: FormData,
): Promise<InboxActionResult> {
  const v = await withId(formData);
  if (!v.ok) return v;
  const user = await requireUser();
  try {
    await setTestimonialStatus(v.id, user.id, "APPROVED");
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/workspaces`);
    return { ok: true };
  } catch (err) {
    if (err instanceof NotTestimonialOwnerError)
      return { ok: false, error: err.message };
    if (err instanceof TestimonialNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not approve." };
  }
}

export async function rejectTestimonialAction(
  formData: FormData,
): Promise<InboxActionResult> {
  const v = await withId(formData);
  if (!v.ok) return v;
  const user = await requireUser();
  try {
    await setTestimonialStatus(v.id, user.id, "REJECTED");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotTestimonialOwnerError)
      return { ok: false, error: err.message };
    if (err instanceof TestimonialNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not reject." };
  }
}

export async function featureTestimonialAction(
  formData: FormData,
): Promise<InboxActionResult> {
  const v = await withId(formData);
  if (!v.ok) return v;
  const user = await requireUser();
  try {
    // Toggle based on current state: read once, flip, write.
    const { db } = await import("@/lib/db");
    const current = await db.testimonial.findUnique({
      where: { id: v.id },
      select: { isFeatured: true },
    });
    if (!current) return { ok: false, error: "Not found." };
    await setTestimonialFeatured(v.id, user.id, !current.isFeatured);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotTestimonialOwnerError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not update." };
  }
}

export async function publishTestimonialAction(
  formData: FormData,
): Promise<InboxActionResult> {
  const v = await withId(formData);
  if (!v.ok) return v;
  const user = await requireUser();
  try {
    const { db } = await import("@/lib/db");
    const current = await db.testimonial.findUnique({
      where: { id: v.id },
      select: { isPublished: true, status: true },
    });
    if (!current) return { ok: false, error: "Not found." };
    // Publishing implicitly approves.
    if (!current.isPublished && current.status !== "APPROVED") {
      await setTestimonialStatus(v.id, user.id, "APPROVED");
    }
    await setTestimonialPublished(v.id, user.id, !current.isPublished);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotTestimonialOwnerError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not update." };
  }
}

export async function deleteTestimonialAction(
  formData: FormData,
): Promise<InboxActionResult> {
  const v = await withId(formData);
  if (!v.ok) return v;
  const user = await requireUser();
  try {
    await deleteTestimonial(v.id, user.id);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof NotTestimonialOwnerError)
      return { ok: false, error: err.message };
    if (err instanceof TestimonialNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not delete." };
  }
}
