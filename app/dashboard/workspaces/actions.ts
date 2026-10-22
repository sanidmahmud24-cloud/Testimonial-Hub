"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  DuplicateSlugError,
  InvalidSlugError,
  NotOwnerError,
} from "@/lib/workspaces/service";

const createSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120),
  slug: z.string().min(1, "Slug is required."),
  description: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z
    .string()
    .url("Logo URL must be a valid URL.")
    .or(z.literal(""))
    .optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Theme color must be a 6-digit hex like #ff00aa.")
    .or(z.literal(""))
    .optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export type WorkspaceActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: "name" | "slug" | "logoUrl" | "themeColor" };

export async function createWorkspaceAction(
  formData: FormData,
): Promise<WorkspaceActionResult> {
  const user = await requireUser();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input.",
      field: issue?.path[0] as "name" | "slug" | undefined,
    };
  }
  try {
    const ws = await createWorkspace({
      ownerId: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
    });
    revalidatePath("/dashboard");
    return { ok: true, id: ws.id };
  } catch (err) {
    if (err instanceof InvalidSlugError) {
      return { ok: false, error: err.message, field: "slug" };
    }
    if (err instanceof DuplicateSlugError) {
      return {
        ok: false,
        error: "That slug is already taken. Try another.",
        field: "slug",
      };
    }
    return { ok: false, error: "Could not create workspace." };
  }
}

export async function updateWorkspaceAction(
  formData: FormData,
): Promise<WorkspaceActionResult> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    themeColor: formData.get("themeColor") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid input.",
      field: issue?.path[0] as
        | "name"
        | "logoUrl"
        | "themeColor"
        | undefined,
    };
  }
  const { id, ...patch } = parsed.data;
  try {
    // `updateWorkspace` returns the up-to-date row, which we need so we
    // can revalidate the public `/c/<slug>` collection form alongside
    // the dashboard routes. Without this revalidation, edits to a
    // workspace's name or description in Settings would not appear on
    // the public collection form until the framework's RSC cache next
    // regenerated it — visible lag between settings save and public
    // page reflect. The page is server-rendered per request anyway,
    // but `revalidatePath` invalidates any framework memoization and
    // is the correct Next.js 16 idiom for "I just wrote to this path".
    const updated = await updateWorkspace(id, user.id, patch);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/workspaces/${id}`);
    revalidatePath(`/c/${updated.slug}`);
    return { ok: true, id };
  } catch (err) {
    if (err instanceof NotOwnerError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not update workspace." };
  }
}

export async function deleteWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }
  try {
    await deleteWorkspace(parsed.data.id, user.id);
  } catch (err) {
    if (err instanceof NotOwnerError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not delete workspace." };
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}