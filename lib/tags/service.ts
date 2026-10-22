// Server-only. Tag management for testimonials.
// Tags are scoped to a workspace (name is unique per workspace) and
// assigned to testimonials via the TestimonialTag join table. Every
// mutation verifies the caller owns the workspace before writing.
// See schema.prisma for the Tag and TestimonialTag models.

import "server-only";
import { z } from "zod";
import type { Tag, TestimonialTag } from "@prisma/client";
import { db } from "@/lib/db";
import { getWorkspaceById } from "@/lib/workspaces/service";

const tagNameSchema = z
  .string()
  .min(1, "Tag name is required.")
  .max(40, "Tag name must be at most 40 characters.")
  // Allow letters, numbers, spaces, hyphens, and ampersands. Trimmed.
  .regex(/^[\p{L}\p{N} &-]+$/u, "Use letters, numbers, spaces, hyphens, or &.");

export type TagWithCount = Tag & { _count: { testimonials: number } };

export class TagNotFoundError extends Error {
  constructor() {
    super("Tag not found.");
    this.name = "TagNotFoundError";
  }
}

export class DuplicateTagError extends Error {
  constructor() {
    super("A tag with that name already exists in this workspace.");
    this.name = "DuplicateTagError";
  }
}

/** Verify the caller owns the workspace. Throws NotOwnerError. */
async function assertWorkspaceOwner(workspaceId: string, userId: string) {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) {
    // Hide existence from non-owners (NFR-01).
    const { NotOwnerError } = await import("@/lib/workspaces/service");
    throw new NotOwnerError();
  }
  if (ws.ownerId !== userId) {
    const { NotOwnerError } = await import("@/lib/workspaces/service");
    throw new NotOwnerError();
  }
}

export async function listTagsForWorkspace(
  workspaceId: string,
  userId: string,
): Promise<TagWithCount[]> {
  await assertWorkspaceOwner(workspaceId, userId);
  return db.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { _count: { select: { testimonials: true } } },
  });
}

export async function createTag(
  workspaceId: string,
  userId: string,
  rawName: string,
): Promise<Tag> {
  await assertWorkspaceOwner(workspaceId, userId);
  const name = tagNameSchema.parse(rawName.trim());
  try {
    return await db.tag.create({
      data: { workspaceId, name },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) throw new DuplicateTagError();
    throw err;
  }
}

export async function deleteTag(
  workspaceId: string,
  userId: string,
  tagId: string,
): Promise<void> {
  await assertWorkspaceOwner(workspaceId, userId);
  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.workspaceId !== workspaceId) throw new TagNotFoundError();
  // TestimonialTag join rows cascade by schema.
  await db.tag.delete({ where: { id: tagId } });
}

/**
 * Assign a tag to a testimonial. The caller must own both the tag's
 * workspace and the testimonial's workspace (which are guaranteed to
 * be the same because tags are workspace-scoped).
 */
export async function assignTagToTestimonial(
  workspaceId: string,
  userId: string,
  tagId: string,
  testimonialId: string,
): Promise<TestimonialTag> {
  await assertWorkspaceOwner(workspaceId, userId);
  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.workspaceId !== workspaceId) throw new TagNotFoundError();

  const testimonial = await db.testimonial.findUnique({
    where: { id: testimonialId },
    select: { workspaceId: true },
  });
  if (!testimonial || testimonial.workspaceId !== workspaceId) {
    // Treat as not found to avoid leaking cross-workspace data.
    throw new TagNotFoundError();
  }

  return db.testimonialTag.upsert({
    where: { testimonialId_tagId: { testimonialId, tagId } },
    create: { testimonialId, tagId },
    update: {},
  });
}

export async function removeTagFromTestimonial(
  workspaceId: string,
  userId: string,
  tagId: string,
  testimonialId: string,
): Promise<void> {
  await assertWorkspaceOwner(workspaceId, userId);
  const tag = await db.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.workspaceId !== workspaceId) throw new TagNotFoundError();
  // Delete is idempotent; missing join row is fine.
  await db.testimonialTag.deleteMany({
    where: { testimonialId, tagId },
  });
}

/** Return the tag rows already attached to a testimonial. */
export async function listTagsForTestimonial(
  workspaceId: string,
  userId: string,
  testimonialId: string,
): Promise<Tag[]> {
  await assertWorkspaceOwner(workspaceId, userId);
  const rows = await db.testimonialTag.findMany({
    where: { testimonialId, tag: { workspaceId } },
    include: { tag: true },
  });
  return rows.map((r) => r.tag);
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}
