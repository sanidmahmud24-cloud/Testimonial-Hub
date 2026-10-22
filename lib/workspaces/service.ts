// Workspace service. The single module that owns Workspace-table access.
// Authorization rules: only the workspace.ownerId can update or delete a
// workspace. SRS-FR-04/05, NFR-01.
import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Workspace } from "@prisma/client";
import { db } from "@/lib/db";

/** Public slugs. 3-32 chars, lowercase a-z, 0-9, single hyphens. */
export const slugSchema = z.string().min(1);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): string {
  if (slug.length < 3) {
    throw new InvalidSlugError("Slug must be at least 3 characters.");
  }
  if (slug.length > 32) {
    throw new InvalidSlugError("Slug must be at most 32 characters.");
  }
  if (!SLUG_REGEX.test(slug)) {
    throw new InvalidSlugError(
      "Slug must be lowercase a-z, 0-9, with single hyphens (no leading/trailing or consecutive).",
    );
  }
  return slug;
}

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Theme color must be a 6-digit hex like #ff00aa.");

const urlOrEmpty = z
  .string()
  .url("Logo URL must be a valid URL.")
  .or(z.literal(""))
  .optional();

const createInput = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1).max(120),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  logoUrl: urlOrEmpty,
  themeColor: hexColor.optional().or(z.literal("").transform(() => undefined)),
});

const updateInput = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: urlOrEmpty,
  themeColor: hexColor.optional().or(z.literal("").transform(() => undefined)),
});

export type CreateWorkspaceInput = z.input<typeof createInput>;
export type UpdateWorkspaceInput = z.input<typeof updateInput>;

export class InvalidSlugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSlugError";
  }
}

export class DuplicateSlugError extends Error {
  constructor() {
    super("A workspace with that slug already exists.");
    this.name = "DuplicateSlugError";
  }
}

export class NotOwnerError extends Error {
  constructor() {
    super("You do not have permission to modify this workspace.");
    this.name = "NotOwnerError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor() {
    super("Workspace not found.");
    this.name = "WorkspaceNotFoundError";
  }
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const parsed = createInput.parse(input);
  const slug = validateSlug(parsed.slug);
  // Per-workspace random salt used to hash submitter IPs into
  // SubmissionToken.ipHash. Generated at create-time; never returned
  // by any public projection. See SRS Appendix B.2 and C.2.
  const ipSalt = randomBytes(32).toString("base64");
  try {
    return await db.workspace.create({
      data: {
        ownerId: parsed.ownerId,
        name: parsed.name,
        slug,
        description: parsed.description ?? null,
        logoUrl: parsed.logoUrl || null,
        themeColor: parsed.themeColor ?? null,
        ipSalt,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) throw new DuplicateSlugError();
    throw err;
  }
}

export async function getWorkspaceBySlug(
  slug: string,
): Promise<Workspace | null> {
  return db.workspace.findUnique({ where: { slug } });
}

export async function getWorkspaceById(
  id: string,
): Promise<Workspace | null> {
  return db.workspace.findUnique({ where: { id } });
}

export async function listWorkspacesForUser(
  ownerId: string,
): Promise<Workspace[]> {
  return db.workspace.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Pending-testimonial counts for every workspace owned by this user.
 * Returns a map of workspaceId -> count. Owner-scoped: we only
 * include counts for workspaces the caller actually owns.
 *
 * Uses a single `groupBy` rather than N+1 lookups so the dashboard
 * renders fast even with many workspaces.
 */
export async function getPendingCountsForOwner(
  ownerId: string,
): Promise<Record<string, number>> {
  const rows = await db.testimonial.groupBy({
    by: ["workspaceId"],
    where: {
      status: "PENDING",
      workspace: { ownerId },
    },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) {
    out[r.workspaceId] = r._count._all;
  }
  return out;
}

/**
 * Per-workspace and aggregate counts used by the dashboard overview
 * cards. Returns:
 *   - totalWorkspaces: number of workspaces owned by this user
 *   - totalPending:    total PENDING testimonials across all owned workspaces
 *   - totalPublished:  total testimonials that are both APPROVED and
 *                      published (these are the ones visible on the
 *                      public Wall of Love and the embed iframe)
 *   - byWorkspace:     per-workspace { pending, published } counts,
 *                      for the workspace-card UI
 *
 * Implemented with two aggregate queries (one on Testimonial.groupBy
 * and one on Workspace.count) so the dashboard renders in O(1) queries
 * regardless of how many workspaces the owner has.
 */
export type WorkspaceCountsById = Record<string, { pending: number; published: number }>;
export type OwnerWorkspaceCounts = {
  totalWorkspaces: number;
  totalPending: number;
  totalPublished: number;
  byWorkspace: WorkspaceCountsById;
};

export async function getWorkspaceCountsForOwner(
  ownerId: string,
): Promise<OwnerWorkspaceCounts> {
  // Per-workspace pending + published counts in a single groupBy.
  const rows = await db.testimonial.groupBy({
    by: ["workspaceId", "status", "isPublished"],
    where: {
      workspace: { ownerId },
    },
    _count: { _all: true },
  });

  const byWorkspace: WorkspaceCountsById = {};
  let totalPending = 0;
  let totalPublished = 0;
  for (const r of rows) {
    const bucket = (byWorkspace[r.workspaceId] ??= { pending: 0, published: 0 });
    if (r.status === "PENDING") {
      bucket.pending += r._count._all;
      totalPending += r._count._all;
    } else if (r.status === "APPROVED" && r.isPublished) {
      bucket.published += r._count._all;
      totalPublished += r._count._all;
    }
  }

  // Workspace count is a separate aggregate; cheap and avoids loading
  // row bodies just to count them.
  const totalWorkspaces = await db.workspace.count({ where: { ownerId } });

  return { totalWorkspaces, totalPending, totalPublished, byWorkspace };
}

/**
 * Dashboard overview helper that folds the workspace list, aggregate
 * counts, and per-workspace counts into a single call.
 *
 * Why this exists:
 *   The dashboard renders the workspace list AND three aggregate stats
 *   that count the same workspaces. Issuing
 *     Promise.all([listWorkspacesForUser, getWorkspaceCountsForOwner])
 *   produces 3 SQL round-trips against the same Workspace table:
 *     1. SELECT * FROM "Workspace" WHERE ownerId = $1 ORDER BY ...
 *     2. SELECT workspaceId, status, isPublished, COUNT(*) ... GROUP BY ...
 *     3. SELECT COUNT(*) FROM "Workspace" WHERE ownerId = $1
 *
 *   Passing the already-loaded workspace list in removes round-trip 3
 *   (the count) and lets the caller compute `totalWorkspaces` from
 *   `workspaces.length`. The net result is the same shape with one
 *   fewer DB hop per dashboard render.
 *
 * `workspaces` MUST be the result of `listWorkspacesForUser(ownerId)`
 * (ascending by createdAt). Tests and other callers that don't
 * already hold the list should continue using the two-call pattern.
 */
export async function getDashboardOverview(
  ownerId: string,
  workspaces: ReadonlyArray<Pick<Workspace, "id" | "ownerId">>,
): Promise<OwnerWorkspaceCounts> {
  // Per-workspace pending + published counts in a single groupBy.
  const rows = await db.testimonial.groupBy({
    by: ["workspaceId", "status", "isPublished"],
    where: {
      workspace: { ownerId },
    },
    _count: { _all: true },
  });

  const byWorkspace: WorkspaceCountsById = {};
  let totalPending = 0;
  let totalPublished = 0;
  for (const r of rows) {
    const bucket = (byWorkspace[r.workspaceId] ??= {
      pending: 0,
      published: 0,
    });
    if (r.status === "PENDING") {
      bucket.pending += r._count._all;
      totalPending += r._count._all;
    } else if (r.status === "APPROVED" && r.isPublished) {
      bucket.published += r._count._all;
      totalPublished += r._count._all;
    }
  }

  // Reuse the list the caller just loaded instead of issuing a
  // separate `db.workspace.count`.
  const allowedIds = new Set(workspaces.map((w) => w.id));
  for (const id of Object.keys(byWorkspace)) {
    if (!allowedIds.has(id)) delete byWorkspace[id];
  }
  const totalWorkspaces = workspaces.filter(
    (w) => w.ownerId === ownerId,
  ).length;

  return { totalWorkspaces, totalPending, totalPublished, byWorkspace };
}

/**
 * Update a workspace. Throws NotOwnerError if the caller is not the owner.
 * Returns the updated workspace.
 */
export async function updateWorkspace(
  id: string,
  ownerId: string,
  patch: UpdateWorkspaceInput,
): Promise<Workspace> {
  const parsed = updateInput.parse(patch);
  const existing = await db.workspace.findUnique({ where: { id } });
  if (!existing) throw new WorkspaceNotFoundError();
  if (existing.ownerId !== ownerId) throw new NotOwnerError();
  return db.workspace.update({
    where: { id },
    data: {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && {
        description: parsed.description,
      }),
      ...(parsed.logoUrl !== undefined && {
        logoUrl: parsed.logoUrl || null,
      }),
      ...(parsed.themeColor !== undefined && {
        themeColor: parsed.themeColor ?? null,
      }),
    },
  });
}

/**
 * Delete a workspace. Throws NotOwnerError if the caller is not the owner.
 * Cascades to all related testimonials, tags, and page views.
 */
export async function deleteWorkspace(
  id: string,
  ownerId: string,
): Promise<void> {
  const existing = await db.workspace.findUnique({ where: { id } });
  if (!existing) throw new WorkspaceNotFoundError();
  if (existing.ownerId !== ownerId) throw new NotOwnerError();
  await db.workspace.delete({ where: { id } });
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}