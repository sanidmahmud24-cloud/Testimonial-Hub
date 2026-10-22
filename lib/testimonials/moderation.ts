// Server-only. Owner-side moderation: approve, reject, feature, and
// publish testimonials. The caller is expected to be the workspace
// owner; every public mutation verifies ownership before writing.
// SRS-FR-09, FR-10, NFR-01.

import "server-only";
import type { Testimonial, TestimonialStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getWorkspaceById } from "@/lib/workspaces/service";

export class NotTestimonialOwnerError extends Error {
  constructor() {
    super("You do not have permission to modify this testimonial.");
    this.name = "NotTestimonialOwnerError";
  }
}

export class TestimonialNotFoundError extends Error {
  constructor() {
    super("Testimonial not found.");
    this.name = "TestimonialNotFoundError";
  }
}

/** Verify the owner of the workspace that owns this testimonial. */
async function assertOwner(
  testimonialId: string,
  userId: string,
): Promise<Testimonial> {
  const t = await db.testimonial.findUnique({
    where: { id: testimonialId },
  });
  if (!t) throw new TestimonialNotFoundError();
  const ws = await getWorkspaceById(t.workspaceId);
  if (!ws) throw new TestimonialNotFoundError();
  if (ws.ownerId !== userId) throw new NotTestimonialOwnerError();
  return t;
}

export async function setTestimonialStatus(
  testimonialId: string,
  userId: string,
  status: TestimonialStatus,
): Promise<Testimonial> {
  await assertOwner(testimonialId, userId);
  return db.testimonial.update({
    where: { id: testimonialId },
    data: { status },
  });
}

export async function setTestimonialFeatured(
  testimonialId: string,
  userId: string,
  isFeatured: boolean,
): Promise<Testimonial> {
  await assertOwner(testimonialId, userId);
  return db.testimonial.update({
    where: { id: testimonialId },
    data: { isFeatured },
  });
}

export async function setTestimonialPublished(
  testimonialId: string,
  userId: string,
  isPublished: boolean,
): Promise<Testimonial> {
  await assertOwner(testimonialId, userId);
  return db.testimonial.update({
    where: { id: testimonialId },
    data: { isPublished },
  });
}

export async function listTestimonialsForOwner(
  workspaceId: string,
  userId: string,
  options?: {
    status?: TestimonialStatus;
    search?: string;
  },
): Promise<Testimonial[]> {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws || ws.ownerId !== userId) throw new NotTestimonialOwnerError();
  const search = options?.search?.trim();
  return db.testimonial.findMany({
    where: {
      workspaceId,
      ...(options?.status ? { status: options.status } : {}),
      ...(search
        ? {
            OR: [
              { submitterName: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Permanently delete a testimonial. Owner-verified; the Workspace
 * relation cascades row removal (Tag/TestimonialTag join rows are
 * cascaded by the schema). This is intentionally separate from
 * `setTestimonialStatus("REJECTED")` — rejection hides from the public
 * surfaces, deletion is irreversible and intended for spam.
 */
export async function deleteTestimonial(
  testimonialId: string,
  userId: string,
): Promise<void> {
  await assertOwner(testimonialId, userId);
  await db.testimonial.delete({ where: { id: testimonialId } });
}
