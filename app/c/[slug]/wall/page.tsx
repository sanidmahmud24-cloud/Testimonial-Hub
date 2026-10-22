import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Heart, Quote, Sparkles } from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/workspaces/service";
import { listPublishedTestimonials } from "@/lib/testimonials/public";
import { CopyLink } from "./copy-link";
import type { Metadata } from "next";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "Wall of Love" };
  return {
    title: `${workspace.name} — Wall of Love`,
    description: `What people are saying about ${workspace.name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function WallOfLovePage({ params }: { params: Params }) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  // Only APPROVED + isPublished rows for this workspace are ever
  // returned. Pending/rejected never reach this component.
  const testimonials = await listPublishedTestimonials(workspace.id);

  // Best-effort absolute URL for the share buttons. Honors reverse-proxy
  // headers; falls back to localhost when the headers are missing.
  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ??
    (h.get("host")?.startsWith("localhost") ? "http" : "https");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const wallUrl = `${proto}://${host}/c/${workspace.slug}/wall`;

  const shareText = `Check out the Wall of Love for ${workspace.name}`;

  return (
    // Local dark scope: the wall keeps the TestimonialHub dark-purple
    // visual language regardless of the host site's theme, matching
    // /c/<slug> and the dashboard.
    <div className="dark">
      <div
        className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0a0f] text-white"
        style={
          workspace.themeColor
            ? ({
                "--workspace-theme-color": workspace.themeColor,
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* Decorative background orbs + grid — same palette as the
            homepage hero and the workspace settings screen. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-48 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
          <div className="absolute top-10 right-0 h-[420px] w-[420px] rounded-full bg-purple-600/20 blur-[110px]" />
          <div className="absolute top-56 left-0 h-[320px] w-[320px] rounded-full bg-fuchsia-600/10 blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage:
                "radial-gradient(ellipse 80% 50% at 50% 0%, #000 40%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 50% at 50% 0%, #000 40%, transparent 100%)",
            }}
          />
        </div>

        {/* ---------- Header ---------- */}
        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
            >
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-bold text-white shadow-lg shadow-violet-500/30"
              >
                T
              </span>
              <span className="text-base font-semibold tracking-tight text-white">
                TestimonialHub
              </span>
            </Link>
            <Link
              href={`/c/${workspace.slug}`}
              className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
            >
              Leave a testimonial
            </Link>
          </div>
        </header>

        {/* ---------- Main ---------- */}
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          {/* Hero */}
          <section className="flex flex-col items-center pt-14 pb-12 text-center sm:pt-20 sm:pb-16">
            {workspace.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={workspace.logoUrl}
                alt={workspace.name}
                className="mb-6 h-14 w-auto rounded-lg"
              />
            ) : null}

            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Sparkles className="size-3" aria-hidden="true" />
              {workspace.name}
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Wall of Love
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Real words from the people who use{" "}
              <span className="font-medium text-zinc-200">
                {workspace.name}
              </span>
              .
            </p>

            {testimonials.length > 0 ? (
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <CopyLink url={wallUrl} />
                <ShareLink
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    shareText,
                  )}&url=${encodeURIComponent(wallUrl)}`}
                >
                  Share on X
                </ShareLink>
                <ShareLink
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    wallUrl,
                  )}`}
                >
                  Share on LinkedIn
                </ShareLink>
              </div>
            ) : null}
          </section>

          {/* Testimonials */}
          {testimonials.length === 0 ? (
            <EmptyState name={workspace.name} slug={workspace.slug} />
          ) : (
            <section aria-label="Customer testimonials">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {testimonials.map((t) => (
                  <TestimonialCard
                    key={t.id}
                    testimonial={t}
                    initials={initialsFor(t.submitterName)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Call to action */}
          <section className="mt-16 flex flex-col items-center text-center sm:mt-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-10 -top-10 -z-10 h-64 bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-fuchsia-600/10 blur-3xl"
            />
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Enjoying {workspace.name}?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Tell the world what you think. Your testimonial may be featured
              on this wall after a quick review.
            </p>
            <Link
              href={`/c/${workspace.slug}`}
              className="group mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            >
              <Heart
                className="size-4 transition-transform group-hover:scale-110"
                aria-hidden="true"
              />
              Submit your own testimonial
            </Link>
          </section>
        </main>

        {/* ---------- Footer ---------- */}
        <footer className="relative z-10 border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white"
              >
                T
              </span>
              <p className="text-sm text-zinc-400">
                Powered by{" "}
                <Link
                  href="/"
                  className="font-medium text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  TestimonialHub
                </Link>
              </p>
            </div>
            <p className="text-xs text-zinc-500 sm:text-sm">
              © {new Date().getFullYear()} {workspace.name}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational helpers                                              */
/* ------------------------------------------------------------------ */

type CardTestimonial = {
  id: string;
  submitterName: string;
  role: string | null;
  company: string | null;
  content: string;
  rating: number | null;
  isFeatured: boolean;
};

/**
 * Deterministic avatar initials. Falls back to "?" for a blank name so
 * the avatar never renders an empty circle.
 */
function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

/** Clamp to the 1–5 range the star rating UI can actually render. */
function starCount(rating: number | null): number {
  if (rating === null) return 0;
  return Math.max(0, Math.min(5, Math.round(rating)));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-4 ${
            i < rating ? "fill-amber-400" : "fill-white/10"
          }`}
        >
          <path d="M10 1.5l2.47 5.34 5.53.63-4.09 3.9 1.09 5.88L10 14.4l-5 2.85 1.09-5.88-4.09-3.9 5.53-.63L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial: t,
  initials,
}: {
  testimonial: CardTestimonial;
  initials: string;
}) {
  const stars = starCount(t.rating);
  const hasSubtitle = Boolean(t.role || t.company);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
        t.isFeatured
          ? // Featured cards pick up a violet edge + tinted wash.
            "border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-white/[0.04] to-transparent shadow-lg shadow-violet-950/30 hover:border-violet-300/50"
          : "border-white/10 bg-white/[0.04] shadow-lg shadow-black/20 hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      {/* Decorative quote glyph */}
      <Quote
        aria-hidden="true"
        className="absolute -right-2 -top-2 size-16 rotate-6 text-white/[0.04] transition-transform duration-300 group-hover:scale-105"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {stars > 0 ? <StarRating rating={stars} /> : null}
          {t.isFeatured ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Featured
            </span>
          ) : null}
        </div>
      </div>

      <blockquote className="relative mt-4 flex-1 text-[15px] leading-relaxed text-zinc-200">
        &ldquo;{t.content}&rdquo;
      </blockquote>

      <footer className="relative mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-sm font-semibold text-white ring-2 ring-white/10"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {t.submitterName}
          </p>
          {hasSubtitle ? (
            <p className="mt-0.5 truncate text-xs text-zinc-400">
              {t.role}
              {t.role && t.company ? " · " : ""}
              {t.company}
            </p>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function ShareLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
    >
      {children}
    </a>
  );
}

function EmptyState({ name, slug }: { name: string; slug: string }) {
  return (
    <section
      aria-label="No published testimonials yet"
      className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-20 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent"
      />
      <div className="relative">
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-violet-950/30"
        >
          <Quote className="size-6 text-violet-300" />
        </span>
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-white">
          No testimonials here yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          {name} hasn&apos;t published any testimonials yet. Be the first to
          share what you think.
        </p>
        <Link
          href={`/c/${slug}`}
          className="mt-7 inline-flex h-10 items-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
        >
          Submit the first testimonial
        </Link>
      </div>
    </section>
  );
}