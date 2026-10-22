"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approveTestimonialAction,
  rejectTestimonialAction,
  featureTestimonialAction,
  publishTestimonialAction,
  deleteTestimonialAction,
} from "./actions";
import {
  createTagAction,
  deleteTagAction,
  assignTagAction,
  removeTagAction,
} from "./tag-actions";

type TestimonialStatus = "PENDING" | "APPROVED" | "REJECTED";

type Testimonial = {
  id: string;
  submitterName: string;
  role: string | null;
  company: string | null;
  email: string | null;
  content: string;
  rating: number | null;
  status: TestimonialStatus;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: Date;
};

type Tag = { id: string; name: string };

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  initial: Testimonial[];
  tags: Tag[];
  tagAssignments: Record<string, string[]>;
  filters: { status?: TestimonialStatus; q: string | null };
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export function InboxList({
  workspaceId,
  workspaceSlug,
  initial,
  tags,
  tagAssignments,
  filters,
  counts,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const [search, setSearch] = useState(filters.q ?? "");

  function run(
    fn: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    fields: Record<string, string> = {},
  ) {
    setError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(async () => {
      const res = await fn(fd);
      if (!res.ok) setError(res.error ?? "Action failed.");
      router.refresh();
    });
  }

  function onDelete(id: string) {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await deleteTestimonialAction(fd);
      if (!res.ok) setError(res.error ?? "Delete failed.");
      setConfirmingDelete(null);
      router.refresh();
    });
  }

  function buildFilterHref(target: { status?: TestimonialStatus; q?: string }) {
    const sp = new URLSearchParams(searchParams);
    if (target.status) sp.set("status", target.status);
    else sp.delete("status");
    if (target.q) sp.set("q", target.q);
    else sp.delete("q");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = search.trim();
    router.push(buildFilterHref({ status: filters.status, q: value || undefined }));
  }

  return (
    <div className="space-y-4">
      <FilterTabs
        pathname={pathname}
        searchParams={searchParams}
        counts={counts}
      />

      <form
        onSubmit={onSearchSubmit}
        className="flex flex-wrap items-center gap-2"
        role="search"
        aria-label="Search testimonials"
      >
        <input
          type="search"
          name="q"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or content…"
          className="flex h-9 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Search
        </Button>
        {filters.q || filters.status ? (
          <Link
            href={pathname}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      <TagsManager
        workspaceId={workspaceId}
        tags={tags}
        pending={pending}
        onError={setError}
        onCreated={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {initial.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No testimonials match this view</CardTitle>
            <CardDescription>
              {filters.q || filters.status
                ? "Try clearing the filters above."
                : "Share your collection link to start receiving testimonials."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="rounded bg-muted px-2 py-1 text-sm">
              /c/{workspaceSlug}
            </code>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {initial.map((t) => (
            <li key={t.id}>
              <TestimonialCard
                testimonial={t}
                pending={pending}
                confirmingDelete={confirmingDelete === t.id}
                onApprove={() =>
                  run(approveTestimonialAction, { id: t.id })
                }
                onReject={() => run(rejectTestimonialAction, { id: t.id })}
                onFeature={() =>
                  run(featureTestimonialAction, { id: t.id })
                }
                onPublish={() =>
                  run(publishTestimonialAction, { id: t.id })
                }
                onAskDelete={() => setConfirmingDelete(t.id)}
                onCancelDelete={() => setConfirmingDelete(null)}
                onConfirmDelete={() => onDelete(t.id)}
                allTags={tags}
                assignedTagIds={tagAssignments[t.id] ?? []}
                onAssignTag={(tagId) =>
                  run(assignTagAction, {
                    workspaceId,
                    tagId,
                    testimonialId: t.id,
                  })
                }
                onRemoveTag={(tagId) =>
                  run(removeTagAction, {
                    workspaceId,
                    tagId,
                    testimonialId: t.id,
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTabs({
  pathname,
  searchParams,
  counts,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  counts: { all: number; pending: number; approved: number; rejected: number };
}) {
  const currentStatus = searchParams.get("status") as TestimonialStatus | null;
  const q = searchParams.get("q");
  const baseQs = q ? `?q=${encodeURIComponent(q)}` : "";
  const tabs: { label: string; count: number; status?: TestimonialStatus }[] = [
    { label: "All", count: counts.all },
    { label: "Pending", count: counts.pending, status: "PENDING" },
    { label: "Approved", count: counts.approved, status: "APPROVED" },
    { label: "Rejected", count: counts.rejected, status: "REJECTED" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Filter testimonials by status"
      className="flex flex-wrap gap-1 rounded-lg border bg-card p-1"
    >
      {tabs.map((t) => {
        const active = (t.status ?? null) === (currentStatus ?? null);
        const href = t.status
          ? `${pathname}?status=${t.status}${q ? `&q=${encodeURIComponent(q)}` : ""}`
          : baseQs || pathname;
        return (
          <Link
            key={t.label}
            href={href}
            role="tab"
            aria-selected={active}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                active
                  ? "bg-violet-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function TagsManager({
  workspaceId,
  tags,
  pending,
  onError,
  onCreated,
  onDeleted,
}: {
  workspaceId: string;
  tags: Tag[];
  pending: boolean;
  onError: (msg: string) => void;
  onCreated: () => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    const fd = new FormData();
    fd.set("workspaceId", workspaceId);
    fd.set("name", value);
    onError("");
    const res = await createTagAction(fd);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    setName("");
    onCreated();
  }

  function onDeleteTag(tagId: string) {
    const fd = new FormData();
    fd.set("workspaceId", workspaceId);
    fd.set("tagId", tagId);
    onError("");
    // Use a transition-flavored flow so router.refresh re-renders.
    // We can't import useTransition here (this is a child component);
    // call the action directly and refresh on success.
    void (async () => {
      const res = await deleteTagAction(fd);
      if (!res.ok) onError(res.error);
      else onDeleted();
    })();
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium"
        aria-expanded={open}
      >
        <span>Tags ({tags.length})</span>
        <span className="text-xs text-muted-foreground">
          {open ? "Hide" : "Manage"}
        </span>
      </button>
      {open ? (
        <div className="border-t px-4 py-3">
          <form onSubmit={onCreate} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="New tag name (e.g. 'Enterprise')"
              className="flex h-8 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="sm" disabled={pending || !name.trim()}>
              Add tag
            </Button>
          </form>
          {tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {tags.map((t) => (
                <li
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
                >
                  {t.name}
                  <button
                    type="button"
                    aria-label={`Delete tag ${t.name}`}
                    onClick={() => onDeleteTag(t.id)}
                    disabled={pending}
                    className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No tags yet. Tags help you group and filter testimonials
              (e.g. by plan, region, or use case).
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TestimonialCard({
  testimonial: t,
  pending,
  confirmingDelete,
  onApprove,
  onReject,
  onFeature,
  onPublish,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  allTags,
  assignedTagIds,
  onAssignTag,
  onRemoveTag,
}: {
  testimonial: Testimonial;
  pending: boolean;
  confirmingDelete: boolean;
  onApprove: () => void;
  onReject: () => void;
  onFeature: () => void;
  onPublish: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  allTags: Tag[];
  assignedTagIds: string[];
  onAssignTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
}) {
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const submittedAt = formatDate(t.createdAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t.submitterName}</CardTitle>
              {t.isFeatured ? (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Featured
                </span>
              ) : null}
            </div>
            <CardDescription>
              {[t.role, t.company, t.email ? `📧 ${t.email}` : null]
                .filter(Boolean)
                .join(" · ")}
            </CardDescription>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {submittedAt}
            </p>
          </div>
          <StatusBadge status={t.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">&ldquo;{t.content}&rdquo;</p>
        {t.rating ? (
          <div className="flex gap-0.5 text-amber-500">
            {Array.from({ length: t.rating }).map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
        ) : null}

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Tags:</span>
            {assignedTagIds.length === 0 ? (
              <span className="text-xs text-muted-foreground/70">none</span>
            ) : (
              assignedTagIds.map((tagId) => {
                const tag = allTags.find((x) => x.id === tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
                  >
                    {tag.name}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag.name}`}
                      onClick={() => onRemoveTag(tagId)}
                      disabled={pending}
                      className="ml-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
            <button
              type="button"
              onClick={() => setTagPickerOpen((o) => !o)}
              disabled={pending || allTags.length === 0}
              className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:border-violet-500/40 hover:text-foreground disabled:opacity-50"
            >
              {tagPickerOpen ? "Close" : "+ tag"}
            </button>
          </div>
          {tagPickerOpen && allTags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {allTags
                .filter((t2) => !assignedTagIds.includes(t2.id))
                .map((t2) => (
                  <li key={t2.id}>
                    <button
                      type="button"
                      onClick={() => onAssignTag(t2.id)}
                      disabled={pending}
                      className="rounded-full border bg-card px-2 py-0.5 text-xs hover:border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50"
                    >
                      + {t2.name}
                    </button>
                  </li>
                ))}
              {allTags.every((t2) => assignedTagIds.includes(t2.id)) ? (
                <li className="text-xs text-muted-foreground">
                  All tags assigned.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {t.status !== "APPROVED" ? (
            <Button size="sm" disabled={pending} onClick={onApprove}>
              Approve
            </Button>
          ) : null}
          {t.status !== "REJECTED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={onReject}
            >
              Reject
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={onFeature}
          >
            {t.isFeatured ? "Unfeature" : "Feature"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onPublish}
          >
            {t.isPublished ? "Unpublish" : "Publish"}
          </Button>
          {confirmingDelete ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={onConfirmDelete}
              >
                Confirm delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={onCancelDelete}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={onAskDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
