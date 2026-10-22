import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/workspaces/service";
import { mintSubmissionToken } from "@/lib/submission-tokens/service";
import { getClientIp } from "@/lib/http/client-ip";
import { CollectionForm } from "./form";
import type { Metadata } from "next";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "Submit a testimonial" };
  return {
    title: `Share your experience — ${workspace.name}`,
    description: `Share your experience with ${workspace.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  // Best-effort socket IP extraction. App Router does not expose a
  // single canonical "request.ip"; we read it from x-forwarded-for as a
  // fallback only when TRUSTED_PROXY=true. With TRUSTED_PROXY=false
  // (default) getClientIp returns the empty string when no socket IP
  // is available, which still produces a stable ipHash.
  const h = await headers();
  const socketIp =
    h.get("x-real-ip") ??
    // Next.js sets x-forwarded-for; with TRUSTED_PROXY=false we ignore it
    // for ip-hash purposes, but getClientIp will use the socket-equivalent
    // path. We pass an empty string here when no reliable value is present.
    "";
  const ip = getClientIp(h, socketIp);
  const userAgent = h.get("user-agent");

  const token = await mintSubmissionToken({
    workspaceId: workspace.id,
    ipSalt: workspace.ipSalt,
    ip,
    userAgent,
  });

  return (
    // Local dark scope so the form matches the marketing homepage's
    // dark/purple visual language regardless of the host site's theme.
    <div className="dark">
      <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
        {/* Background gradient orbs — same palette as the homepage Hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
          <div className="absolute top-40 left-0 h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
          {/* Brand block */}
          <header className="space-y-3 text-center">
            {workspace.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.logoUrl}
                alt={workspace.name}
                className="mx-auto h-12 w-auto"
              />
            ) : (
              <div
                aria-hidden="true"
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-base font-semibold text-white shadow-lg shadow-violet-500/30"
              >
                {workspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Sparkles className="size-3" aria-hidden="true" />
              Share your experience
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {workspace.name} would love your feedback
            </h1>
            {workspace.description ? (
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                {workspace.description}
              </p>
            ) : (
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Tell us about your experience. Your testimonial may be featured
                on the public wall after review.
              </p>
            )}
          </header>

          {/* Glowing form card frame, matches homepage ProductPreview */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-fuchsia-600/20 blur-2xl"
            />
            <div className="relative rounded-2xl border border-white/10 bg-[#12121a]/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <CollectionForm
                slug={workspace.slug}
                tokenPlaintext={token.plaintext}
                tokenExpiresAt={token.expiresAt.toISOString()}
              />
            </div>
          </div>

          <footer className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>
              Your submission is private until the workspace owner reviews it.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
