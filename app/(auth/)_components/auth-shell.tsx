// Shared visual shell used by /sign-in and /sign-up so both pages are
// visually identical. Background, decorative orbs/grid, logo card, and
// testimonial preview panel are all rendered here so we don't drift
// between the two routes.
//
// This file is purely presentational. The actual auth flow lives in
// the page-level server actions (signInAction in sign-in/page.tsx and
// signUpAction in lib/auth/actions.ts). This component does not call
// any auth / DB / network code — it's safe to render on both server
// and client.

import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footerLink,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerLink: { prompt: string; href: string; label: string };
}) {
  return (
    <div className="dark relative min-h-svh overflow-hidden bg-[#0a0a0f] text-white">
      {/* Background gradients / glow orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-0 -left-32 h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
      </div>

      {/* Top brand bar */}
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        >
          <Logo />
          <span className="text-base font-semibold tracking-tight">
            TestimonialHub
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs text-zinc-400 transition-colors hover:text-white sm:text-sm"
        >
          ← Back to home
        </Link>
      </div>

      {/* Main content area: form on the left, decorative panel on the right */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-stretch gap-10 px-4 pb-16 pt-4 sm:px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-12">
        <section className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-600/15 via-purple-600/15 to-fuchsia-600/15 blur-2xl"
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a]/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
              <div className="mb-6 space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
                  {title.includes("Create") ? "Sign up" : "Sign in"}
                </span>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {title}
                </h1>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {subtitle}
                </p>
              </div>
              {children}
              <div className="mt-6 border-t border-white/5 pt-4">
                <p className="text-center text-sm text-zinc-400">
                  {footerLink.prompt}{" "}
                  <Link
                    href={footerLink.href}
                    className="font-semibold text-violet-300 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {footerLink.label}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Decorative testimonial panel — hidden on mobile, shown ≥ lg */}
        <aside
          aria-hidden="true"
          className="relative hidden lg:block"
        >
          <div className="relative mx-auto max-w-md">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 blur-2xl"
            />
            <div className="relative space-y-4">
              <PreviewCard
                tone="from-violet-500/20 to-purple-500/10"
                ring="ring-violet-500/20"
                quote="Sample testimonial copy. Approve in the inbox, then publish to a Wall of Love your customers will actually share."
                author="Moderation inbox"
                meta="Preview"
                icon={<InboxIcon />}
              />
              <PreviewCard
                tone="from-emerald-500/20 to-teal-500/10"
                ring="ring-emerald-500/20"
                quote="/c/<slug>/wall — every approved testimonial renders here, ready to share or screenshot."
                author="Wall of Love"
                meta="Public"
                icon={<StarIcon />}
              />
              <PreviewCard
                tone="from-cyan-500/20 to-blue-500/10"
                ring="ring-cyan-500/20"
                quote="Drop /embed/<slug> on any page for inline testimonials. One iframe, no SDK."
                author="Website embed"
                meta="Embed"
                icon={<CodeIcon />}
              />
            </div>
            <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-400/80">
              Illustrative — sample content only
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function PreviewCard({
  tone,
  ring,
  quote,
  author,
  meta,
  icon,
}: {
  tone: string;
  ring: string;
  quote: string;
  author: string;
  meta: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${tone} p-5 shadow-xl shadow-black/30 ring-1 ${ring} backdrop-blur-xl`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
          {icon}
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
          {meta}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-100">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="mt-3 text-xs font-medium text-zinc-300">{author}</p>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/30">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4 text-white"
        aria-hidden="true"
      >
        <path
          d="M7 7h4v4H7V7zm6 0h4v4h-4V7zM7 13h4v4H7v-4zm6 0h4v4h-4v-4z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/* Small inline SVG icons — kept local to avoid pulling lucide into
   the auth bundle (the dashboard already pulls it in). */

function InboxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
