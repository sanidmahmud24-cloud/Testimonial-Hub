import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Eye,
  FolderPlus,
  Inbox as InboxIcon,
  Link as LinkIcon,
  ListChecks,
  Megaphone,
  Plus,
  Send,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  getDashboardOverview,
  listWorkspacesForUser,
} from "@/lib/workspaces/service";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();
  // Single workspace list, reused for both the rendered grid and the
  // overview stats via `getDashboardOverview`. The previous design
  // made two queries against the Workspace table (a SELECT * for the
  // grid + a SELECT COUNT(*) inside `getWorkspaceCountsForOwner`);
  // passing the list back in saves the COUNT round-trip per render.
  const workspaces = await listWorkspacesForUser(user.id);
  const counts = await getDashboardOverview(user.id, workspaces);

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Hero / welcome */}
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="size-3" aria-hidden="true" />
            Dashboard
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Testimonial Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            Manage your workspaces, collect customer feedback, review
            submissions, and showcase published testimonials—all in one place.
          </p>
        </div>

        <Button
          render={<Link href="/dashboard/workspaces/new" />}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create Workspace
        </Button>
      </section>

      {/* Overview stats — real DB counts, owner-scoped */}
      <OverviewStats
        totalWorkspaces={counts.totalWorkspaces}
        totalPending={counts.totalPending}
        totalPublished={counts.totalPublished}
      />

      {/* How it works — 5-step visual flow */}
      <HowItWorks />

      {/* Workspaces grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Workspaces
          </h2>
          <span className="text-xs text-zinc-500">
            {workspaces.length} total
          </span>
        </div>

        {workspaces.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {workspaces.map((w) => {
              const wsCounts = counts.byWorkspace[w.id] ?? {
                pending: 0,
                published: 0,
              };
              return (
                <li key={w.id}>
                  <WorkspaceCard
                    id={w.id}
                    name={w.name}
                    slug={w.slug}
                    description={w.description}
                    pending={wsCounts.pending}
                    published={wsCounts.published}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function OverviewStats({
  totalWorkspaces,
  totalPending,
  totalPublished,
}: {
  totalWorkspaces: number;
  totalPending: number;
  totalPublished: number;
}) {
  return (
    <section
      aria-label="Account overview"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <StatCard
        label="Workspaces"
        value={totalWorkspaces}
        icon={<FolderPlus className="size-4" />}
        tone="violet"
        helper={
          totalWorkspaces === 0
            ? "Create your first one to get started"
            : totalWorkspaces === 1
              ? "1 active workspace"
              : `${totalWorkspaces} active workspaces`
        }
      />
      <StatCard
        label="Pending testimonials"
        value={totalPending}
        icon={<InboxIcon className="size-4" />}
        tone="amber"
        helper={
          totalPending === 0
            ? "All caught up — nothing to review"
            : totalPending === 1
              ? "1 submission awaiting review"
              : `${totalPending} submissions awaiting review`
        }
      />
      <StatCard
        label="Published"
        value={totalPublished}
        icon={<Megaphone className="size-4" />}
        tone="emerald"
        helper={
          totalPublished === 0
            ? "Live on the Wall of Love once you publish"
            : totalPublished === 1
              ? "1 visible on the public wall"
              : `${totalPublished} visible on the public wall`
        }
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  helper,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "violet" | "amber" | "emerald";
  helper: string;
}) {
  const tones = {
    violet: {
      chip: "border-violet-500/20 bg-violet-500/10 text-violet-300",
      icon: "text-violet-300",
    },
    amber: {
      chip: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      icon: "text-amber-300",
    },
    emerald: {
      chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      icon: "text-emerald-300",
    },
  } as const;
  const t = tones[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/70 p-5 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-purple-500/[0.04]"
      />
      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${t.chip}`}
        >
          {icon}
          {label}
        </span>
      </div>
      <div className="relative mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
          {value}
        </span>
      </div>
      <p className="relative mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <FolderPlus className="size-4" />,
      title: "Create workspace",
      body: "Set up one workspace per brand, product, or campaign.",
    },
    {
      icon: <Share2 className="size-4" />,
      title: "Share collection link",
      body: "Send the public /c/<slug> link to your customers.",
    },
    {
      icon: <ListChecks className="size-4" />,
      title: "Review submissions",
      body: "Approve or reject in the private dashboard inbox.",
    },
    {
      icon: <CheckCircle2 className="size-4" />,
      title: "Publish",
      body: "Publish approved testimonials to make them public.",
    },
    {
      icon: <Star className="size-4" />,
      title: "Showcase on Wall of Love",
      body: "Published testimonials appear on your public wall and embed.",
    },
  ];
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/60 p-5 shadow-lg shadow-black/20 backdrop-blur-xl sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-fuchsia-500/[0.04]"
      />
      <div className="relative space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          <Wand2 className="size-3" aria-hidden="true" />
          How it works
        </span>
        <h2
          id="how-it-works-heading"
          className="text-base font-semibold tracking-tight text-white"
        >
          From submission to showcase in five steps
        </h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          A simple workflow for collecting, reviewing, and publishing customer
          testimonials.
        </p>
      </div>
      <ol className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-violet-400/30 hover:bg-violet-500/[0.06]"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-[11px] font-semibold text-white shadow-md shadow-violet-500/30">
                {i + 1}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-violet-300">
                {s.icon}
                {`Step ${i + 1}`}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white">{s.title}</h3>
            <p className="mt-1 text-xs leading-snug text-zinc-400">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WorkspaceCard({
  id,
  name,
  slug,
  description,
  pending,
  published,
}: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pending: number;
  published: number;
}) {
  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/70 shadow-lg shadow-black/20 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-violet-500/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-semibold text-white shadow-lg shadow-violet-500/30"
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-white">
              {name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">/{slug}</p>
          </div>
        </div>
        {pending > 0 ? (
          <span
            aria-label={`${pending} pending testimonial${pending === 1 ? "" : "s"}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
          >
            <InboxIcon className="size-3" aria-hidden="true" />
            {pending}
          </span>
        ) : null}
      </div>

      {description ? (
        <p className="relative mx-5 line-clamp-2 text-sm text-zinc-400">
          {description}
        </p>
      ) : (
        <p className="relative mx-5 text-sm italic text-zinc-600">
          No description yet.
        </p>
      )}

      <div className="relative mx-5 mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-xs text-zinc-400">
        <LinkIcon
          className="size-3 shrink-0 text-zinc-500"
          aria-hidden="true"
        />
        <code className="truncate rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
          /c/{slug}
        </code>
        {published > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <Megaphone className="size-2.5" aria-hidden="true" />
            {published} live
          </span>
        ) : null}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 p-5 pt-0 sm:grid-cols-5">
        <WorkspaceAction
          href={`/dashboard/workspaces/${id}/inbox`}
          icon={<InboxIcon className="size-3.5" />}
          label="Open"
          title={`Open ${name}`}
        />
        <WorkspaceAction
          href={`/c/${slug}`}
          icon={<Send className="size-3.5" />}
          label="Collect"
          title={`Open public collection form for ${name}`}
          external
        />
        <WorkspaceAction
          href={`/dashboard/workspaces/${id}/inbox`}
          icon={<InboxIcon className="size-3.5" />}
          label="Inbox"
          title={`Review submissions for ${name}`}
        />
        <WorkspaceAction
          href={`/c/${slug}/wall`}
          icon={<Eye className="size-3.5" />}
          label="Wall"
          title={`View Wall of Love for ${name}`}
          external
        />
        <WorkspaceAction
          href={`/dashboard/workspaces/${id}`}
          icon={<SettingsIcon className="size-3.5" />}
          label="Settings"
          title={`Edit settings for ${name}`}
        />
      </div>
    </article>
  );
}

function WorkspaceAction({
  href,
  icon,
  label,
  title,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      title={title}
      className="group/btn inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-zinc-200 transition-all hover:-translate-y-px hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
    >
      {icon}
      <span className="truncate">{label}</span>
      {external ? (
        <ArrowRight
          className="size-3 text-zinc-500 transition-transform group-hover/btn:translate-x-0.5"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06]"
      />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30"
        >
          <Code2 className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            You don&apos;t have any workspaces yet
          </h2>
          <p className="mx-auto max-w-md text-sm text-zinc-400">
            Create your first one to start collecting testimonials, moderating
            them in a private inbox, and publishing a Wall of Love.
          </p>
        </div>
        <Button
          render={<Link href="/dashboard/workspaces/new" />}
          className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12121a]"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create a workspace
        </Button>
      </div>
    </div>
  );
}