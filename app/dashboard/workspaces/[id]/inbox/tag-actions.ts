"use server";

// Server actions for tag management in the inbox. These are kept in a
// separate file from the moderation actions so each file has a single
// concern and the inbox-list client component can group its imports
// cleanly.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  createTag,
  deleteTag,
  assignTagToTestimonial,
  removeTagFromTestimonial,
  DuplicateTagError,
  TagNotFoundError,
} from "@/lib/tags/service";

const workspaceIdSchema = z.object({ workspaceId: z.string().min(1) });

const createTagSchema = workspaceIdSchema.extend({
  name: z.string().min(1).max(40),
});

const assignSchema = z.object({
  workspaceId: z.string().min(1),
  tagId: z.string().min(1),
  testimonialId: z.string().min(1),
});

const removeSchema = assignSchema;

export type TagActionResult =
  | { ok: true; tagId?: string }
  | { ok: false; error: string };

export async function createTagAction(
  formData: FormData,
): Promise<TagActionResult> {
  const parsed = createTagSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const user = await requireUser();
  try {
    const tag = await createTag(parsed.data.workspaceId, user.id, parsed.data.name);
    revalidatePath(`/dashboard/workspaces`);
    return { ok: true, tagId: tag.id };
  } catch (err) {
    if (err instanceof DuplicateTagError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not create tag." };
  }
}

export async function deleteTagAction(
  formData: FormData,
): Promise<TagActionResult> {
  const parsed = z
    .object({ workspaceId: z.string().min(1), tagId: z.string().min(1) })
    .safeParse({
      workspaceId: formData.get("workspaceId"),
      tagId: formData.get("tagId"),
    });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const user = await requireUser();
  try {
    await deleteTag(parsed.data.workspaceId, user.id, parsed.data.tagId);
    revalidatePath(`/dashboard/workspaces`);
    return { ok: true };
  } catch (err) {
    if (err instanceof TagNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not delete tag." };
  }
}

export async function assignTagAction(
  formData: FormData,
): Promise<TagActionResult> {
  const parsed = assignSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    tagId: formData.get("tagId"),
    testimonialId: formData.get("testimonialId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const user = await requireUser();
  try {
    await assignTagToTestimonial(
      parsed.data.workspaceId,
      user.id,
      parsed.data.tagId,
      parsed.data.testimonialId,
    );
    revalidatePath(`/dashboard/workspaces`);
    return { ok: true };
  } catch (err) {
    if (err instanceof TagNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not assign tag." };
  }
}

export async function removeTagAction(
  formData: FormData,
): Promise<TagActionResult> {
  const parsed = removeSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    tagId: formData.get("tagId"),
    testimonialId: formData.get("testimonialId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const user = await requireUser();
  try {
    await removeTagFromTestimonial(
      parsed.data.workspaceId,
      user.id,
      parsed.data.tagId,
      parsed.data.testimonialId,
    );
    revalidatePath(`/dashboard/workspaces`);
    return { ok: true };
  } catch (err) {
    if (err instanceof TagNotFoundError)
      return { ok: false, error: err.message };
    return { ok: false, error: "Could not remove tag." };
  }
}
