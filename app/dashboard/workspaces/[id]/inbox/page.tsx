import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceById } from "@/lib/workspaces/service";
import { listTestimonialsForOwner } from "@/lib/testimonials/moderation";
import { listTagsForWorkspace } from "@/lib/tags/service";
import { db } from "@/lib/db";
import { InboxList } from "./inbox-list";
import type { TestimonialStatus } from "@prisma/client";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  status?: string;
  q?: string;
}>;

const ALLOWED_STATUSES: TestimonialStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

function parseStatus(raw: string | undefined): TestimonialStatus | undefined {
  if (!raw) return undefined;
  return (ALLOWED_STATUSES as string[]).includes(raw)
    ? (raw as TestimonialStatus)
    : undefined;
}

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;

  const workspace = await getWorkspaceById(id);
  if (!workspace || workspace.ownerId !== user.id) notFound();

  const status = parseStatus(sp.status);
  const q = sp.q?.slice(0, 100);

  const [testimonials, tags] = await Promise.all([
    listTestimonialsForOwner(workspace.id, user.id, { status, search: q }),
    listTagsForWorkspace(workspace.id, user.id),
  ]);

  // Counts for filter tabs. Done in parallel with the list query above.
  // "all" is unfiltered so the tab count is always correct regardless
  // of which filter is active.
  const [pendingCount, approvedCount, rejectedCount, allCount] =
    await Promise.all([
      listTestimonialsForOwner(workspace.id, user.id, { status: "PENDING" }),
      listTestimonialsForOwner(workspace.id, user.id, { status: "APPROVED" }),
      listTestimonialsForOwner(workspace.id, user.id, { status: "REJECTED" }),
      listTestimonialsForOwner(workspace.id, user.id),
    ]);

  // Fetch current tag assignments for the visible testimonials so the
  // inbox can show / un-show tag chips per row.
  const tagAssignments: Record<string, string[]> = {};
  if (testimonials.length > 0) {
    const joins = await db.testimonialTag.findMany({
      where: {
        testimonialId: { in: testimonials.map((t) => t.id) },
        tag: { workspaceId: workspace.id },
      },
      select: { testimonialId: true, tagId: true },
    });
    for (const j of joins) {
      (tagAssignments[j.testimonialId] ??= []).push(j.tagId);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace.name} — Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Review, approve, and publish testimonials. Featured testimonials
          appear first on your Wall of Love.
        </p>
      </div>
      <InboxList
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        initial={testimonials}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        tagAssignments={tagAssignments}
        filters={{ status, q: q ?? null }}
        counts={{
          all: allCount.length,
          pending: pendingCount.length,
          approved: approvedCount.length,
          rejected: rejectedCount.length,
        }}
      />
    </div>
  );
}