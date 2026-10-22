// Server-only. Public projections for the Wall of Love and embed.
// Never returns the submitter email. Only APPROVED + isPublished rows
// are exposed. SRS-FR-12, NFR-03.

import "server-only";
import { db } from "@/lib/db";

export type PublicTestimonial = {
  id: string;
  submitterName: string;
  role: string | null;
  company: string | null;
  content: string;
  rating: number | null;
  isFeatured: boolean;
  createdAt: Date;
};

export async function listPublishedTestimonials(
  workspaceId: string,
): Promise<PublicTestimonial[]> {
  const rows = await db.testimonial.findMany({
    where: {
      workspaceId,
      status: "APPROVED",
      isPublished: true,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      submitterName: true,
      role: true,
      company: true,
      content: true,
      rating: true,
      isFeatured: true,
      createdAt: true,
      // email is intentionally NOT selected — owner-only data.
    },
  });
  return rows;
}

export async function listEmbedTestimonials(
  workspaceId: string,
  limit = 20,
): Promise<PublicTestimonial[]> {
  const rows = await db.testimonial.findMany({
    where: {
      workspaceId,
      status: "APPROVED",
      isPublished: true,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, Math.min(limit, 50)),
    select: {
      id: true,
      submitterName: true,
      role: true,
      company: true,
      content: true,
      rating: true,
      isFeatured: true,
      createdAt: true,
    },
  });
  return rows;
}
