import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowLeft,
  Inbox,
  ExternalLink,
  Code2,
  Link as LinkIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceById } from "@/lib/workspaces/service";
import { WorkspaceSettingsForm } from "./form";
import { CopyLink } from "./copy-link";

type Params = Promise<{ id: string }>;

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;

  const workspace = await getWorkspaceById(id);
  if (!workspace) notFound();
  // Hide existence from non-owners (NFR-01).
  if (workspace.ownerId !== user.id) notFound();

  // Derive the absolute share URL from request headers so the copy
  // button gives the user the URL they would actually visit.
  // We use x-forwarded-host/proto first to honor reverse proxies; fall
  // back to the request host header. The result is best-effort — the
  // user can still copy the relative path from the visible code chip.
  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ??
    (h.get("host")?.startsWith("localhost") ? "http" : "https");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const shareUrl = `${proto}://${host}/c/${workspace.slug}`;

  return (
    // Local dark scope so the rest of the dashboard keeps its default
    // light theme, but the settings flow matches the marketing homepage.
    <div className="dark -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0a0a0f] text-white">
        {/* Background gradient orbs — same palette as the homepage Hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute top-40 left-0 h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to workspaces
          </Link>

          {/* Workspace header card */}
          <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-base font-semibold text-white shadow-lg shadow-violet-500/30"
                  aria-hidden="true"
                >
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300">
                    Workspace settings
                  </span>
                  <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                    {workspace.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-zinc-400">
                    <LinkIcon
                      className="size-3.5 shrink-0 text-zinc-500"
                      aria-hidden="true"
                    />
                    <code className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-200">
                      /c/{workspace.slug}
                    </code>
                    <span className="truncate text-zinc-500">
                      ·&nbsp;{shareUrl}
                    </span>
                  </div>
                </div>
              </div>
              <CopyLink url={shareUrl} />
            </div>
          </header>

          {/* Navigation tabs: Inbox / Wall of Love / Embed */}
          <nav
            aria-label="Workspace destinations"
            className="flex flex-wrap gap-2"
          >
            <NavTab
              href={`/dashboard/workspaces/${workspace.id}/inbox`}
              icon={<Inbox className="size-3.5" />}
              label="Inbox"
            />
            <NavTab
              href={`/c/${workspace.slug}/wall`}
              icon={<ExternalLink className="size-3.5" />}
              label="Wall of Love"
              external
            />
            <NavTab
              href={`/embed/${workspace.slug}`}
              icon={<Code2 className="size-3.5" />}
              label="Embed"
              external
            />
            <NavTab
              href={`/dashboard/workspaces/${workspace.id}`}
              icon={<SettingsIcon className="size-3.5" />}
              label="Settings"
              active
            />
          </nav>

          {/* Settings card + Danger Zone.
              Glowing frame matches the homepage's ProductPreview mockup. */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 blur-2xl"
            />
            <div className="relative rounded-2xl border border-white/10 bg-[#12121a]/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <SettingsIcon
                  className="size-4 text-violet-300"
                  aria-hidden="true"
                />
                <h2 className="text-base font-semibold tracking-tight text-white">
                  Workspace details
                </h2>
              </div>
              <WorkspaceSettingsForm
                workspace={{
                  id: workspace.id,
                  name: workspace.name,
                  description: workspace.description,
                  logoUrl: workspace.logoUrl,
                  themeColor: workspace.themeColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavTab({
  href,
  icon,
  label,
  external,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
  active?: boolean;
}) {
  const classes = active
    ? "border-violet-400/40 bg-violet-500/15 text-violet-200 shadow-inner shadow-violet-500/10"
    : "border-white/10 bg-white/5 text-zinc-200 hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white";
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${classes}`}
    >
      {icon}
      <span>{label}</span>
      {external ? (
        <ExternalLink
          className="size-3 text-zinc-500"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}
