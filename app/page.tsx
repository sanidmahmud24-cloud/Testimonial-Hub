import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";

/**
 * Public marketing homepage. Polished, premium SaaS landing page styled
 * to match TestimonialHub's dark, violet-accent visual language. Built
 * around the capabilities actually shipped today:
 *
 *   - Workspace creation
 *   - Public collection form at /c/<slug>
 *   - Moderation inbox at /dashboard/workspaces/<id>/inbox
 *   - Published Wall of Love at /c/<slug>/wall
 *   - Embeddable iframe at /embed/<slug>
 *
 * All demo content (avatars, sample names, sample testimonial copy in
 * the showcase) is clearly labelled as illustrative and is never
 * presented as a real customer endorsement. Prices, plans, payment
 * features, fake company logos, and other non-existent functionality
 * are deliberately omitted.
 *
 * Server component. Auth() is read for the nav; no DB calls.
 */

// Static year for the footer. Hard-coded to avoid `new Date()` in
// server components, which Next.js rejects during prerendering because
// the value is unstable across requests.
const FOOTER_YEAR = 2026;

export default function HomePage() {
  // Cache Components: reading the session is request-time data, so it
  // can't be part of the prerendered static shell. Per the Next.js 16
  // auth-with-Cache-Components guide, the session read lives inside a
  // <Suspense> boundary instead of calling `connection()` at the top
  // level (which blocks the whole route from prerendering).
  //
  // Everything outside this boundary still prerenders and ships in the
  // static shell; only the session-derived CTA copy streams in.
  return (
    <div className="dark min-h-screen bg-[#0a0a0f] text-white">
      <Suspense fallback={<Navbar isSignedIn={false} />}>
        <NavbarWithSession />
      </Suspense>
      <Suspense fallback={<Hero isSignedIn={false} />}>
        <HeroWithSession />
      </Suspense>
      <ProductPreview />
      <Features />
      <HowItWorks />
      <Suspense fallback={<Showcase isSignedIn={false} />}>
        <ShowcaseWithSession />
      </Suspense>
      <Suspense fallback={<Pricing isSignedIn={false} />}>
        <PricingWithSession />
      </Suspense>
      <Suspense fallback={<CTASection isSignedIn={false} />}>
        <CTASectionWithSession />
      </Suspense>
      <Footer />
    </div>
  );
}

/**
 * Reads the session at request time. Kept in its own component so the
 * read happens behind the caller's <Suspense> boundary rather than at
 * the page's top level.
 */
async function SessionGate({
  children,
}: {
  children: (isSignedIn: boolean) => React.ReactNode;
}) {
  const session = await auth();
  return <>{children(Boolean(session?.user))}</>;
}

async function NavbarWithSession() {
  return (
    <SessionGate>
      {(isSignedIn) => <Navbar isSignedIn={isSignedIn} />}
    </SessionGate>
  );
}

async function HeroWithSession() {
  return (
    <SessionGate>
      {(isSignedIn) => <Hero isSignedIn={isSignedIn} />}
    </SessionGate>
  );
}

async function ShowcaseWithSession() {
  return (
    <SessionGate>
      {(isSignedIn) => <Showcase isSignedIn={isSignedIn} />}
    </SessionGate>
  );
}

async function PricingWithSession() {
  return (
    <SessionGate>
      {(isSignedIn) => <Pricing isSignedIn={isSignedIn} />}
    </SessionGate>
  );
}

async function CTASectionWithSession() {
  return (
    <SessionGate>
      {(isSignedIn) => <CTASection isSignedIn={isSignedIn} />}
    </SessionGate>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/* ------------------------------------------------------------------ */

function Navbar({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 shadow-[0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        >
          <Logo />
          <span className="text-base font-semibold tracking-tight">
            TestimonialHub
          </span>
        </Link>
        <ul className="hidden items-center gap-8 md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it works" },
            { href: "#showcase", label: "Showcase" },
            { href: "#pricing", label: "Pricing" },
            { href: "/dashboard", label: "Dashboard" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] rounded-sm"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
        <details className="group relative md:hidden">
          <summary
            aria-label="Open menu"
            className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200 transition-colors hover:bg-white/10 [&::-webkit-details-marker]:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 group-open:hidden"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hidden size-4 group-open:block"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </summary>
          <div className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-[#0f0f15]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <ul className="space-y-1">
              {[
                { href: "#features", label: "Features" },
                { href: "#how-it-works", label: "How it works" },
                { href: "#showcase", label: "Showcase" },
                { href: "#pricing", label: "Pricing" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="my-2 h-px bg-white/5" />
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="block rounded-md bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 text-center text-sm font-medium text-white shadow-lg shadow-violet-500/25"
              >
                Go to dashboard
              </Link>
            ) : (
              <div className="space-y-1">
                <Link
                  href="/sign-in"
                  className="block rounded-md px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="block rounded-md bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 text-center text-sm font-medium text-white shadow-lg shadow-violet-500/25"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </details>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
        <div className="absolute top-40 left-0 h-[300px] w-[300px] rounded-full bg-fuchsia-600/10 blur-[80px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,black,transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:pt-32">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-violet-400" />
          </span>
          Now in public beta
        </div>
        <h1 className="mx-auto max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          Capture, measure & showcase{" "}
          <span className="relative inline-block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            customer love
            <span
              aria-hidden="true"
              className="absolute -inset-x-2 -inset-y-1 -z-10 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 blur-2xl"
            />
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
          Collect text and video testimonials through a branded link, moderate
          them in one inbox, and publish a beautiful Wall of Love on your site —
          in minutes, not weeks.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isSignedIn ? (
            <Link
              href="/dashboard/workspaces/new"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-7 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
            >
              Start collecting testimonials
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-7 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
            >
              Start collecting testimonials
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <a
            href="#showcase"
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
          >
            <Eye className="size-4" aria-hidden="true" />
            Explore showcase
          </a>
        </div>
        <p className="mt-5 text-xs text-zinc-500">
          No credit card required · Email + password sign-up
        </p>

        {/* Real-route trust strip — references actual product surfaces,
            not fake company names. */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <LinkIcon className="size-3 text-violet-400" /> /c/&lt;slug&gt;
          </span>
          <span className="text-zinc-700">/</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <Send className="size-3 text-violet-400" /> Submit
          </span>
          <span className="text-zinc-700">/</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <InboxIcon className="size-3 text-violet-400" /> Moderate
          </span>
          <span className="text-zinc-700">/</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <Star className="size-3 text-violet-400" /> Publish
          </span>
          <span className="text-zinc-700">/</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400">
            <Code2 className="size-3 text-violet-400" /> Embed
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product preview — realistic UI previews of what the product looks    */
/* like. All content is clearly tagged as illustrative.                 */
/* ------------------------------------------------------------------ */

function ProductPreview() {
  return (
    <section
      aria-labelledby="product-preview-heading"
      className="relative py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="size-3" aria-hidden="true" />
            Product preview
          </span>
          <h2
            id="product-preview-heading"
            className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Your customer feedback, organized
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-zinc-400">
            A focused dashboard for collecting, moderating, and publishing
            testimonials your customers will love to share. The samples below
            show the inbox and the public Wall of Love.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PreviewCard
            title="Moderation inbox"
            subtitle="Dashboard / Workspaces / Inbox"
            badge="3 new"
            badgeTone="amber"
          >
            <div className="space-y-3">
              {SAMPLE_INBOX.map((t) => (
                <article
                  key={t.name}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-violet-500/20"
                >
                  <div className="flex items-start gap-3">
                    <div
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-semibold text-white`}
                    >
                      {t.initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {t.name}
                          </p>
                          <p className="text-xs text-zinc-500">{t.role}</p>
                        </div>
                        <Stars n={t.rating} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        &ldquo;{t.content}&rdquo;
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                          <Check className="size-3" /> Approve
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300">
                          <Star className="size-3" /> Feature
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-zinc-400">
                          Reject
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </PreviewCard>

          <PreviewCard
            title="Wall of Love"
            subtitle="/c/<slug>/wall"
            badge="Public"
            badgeTone="emerald"
          >
            <div className="space-y-3">
              <div className="text-xs text-zinc-500">
                A grid of approved testimonials you can publish at{" "}
                <code className="font-mono text-[11px] text-violet-300">
                  /c/&lt;slug&gt;/wall
                </code>
                .
              </div>
              {SAMPLE_WALL.map((t) => (
                <article
                  key={t.name}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
                >
                  <Stars n={t.rating} />
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-semibold text-white`}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{t.name}</p>
                      <p className="text-[11px] text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </article>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-400">
                <span>
                  Want to see the embed?
                  <Link
                    href={`/embed/<slug>`}
                    className="ml-1 text-violet-300 underline-offset-2 hover:underline"
                  >
                    /embed/&lt;slug&gt;
                  </Link>
                </span>
                <Link
                  href="/dashboard/workspaces/new"
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  Create your wall
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </PreviewCard>
        </div>

        <p className="mt-6 text-center text-xs uppercase tracking-wider text-zinc-600">
          Illustrative — sample data, not real customers
        </p>
      </div>
    </section>
  );
}

function PreviewCard({
  title,
  subtitle,
  badge,
  badgeTone,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: "amber" | "emerald";
  children: React.ReactNode;
}) {
  const tone =
    badgeTone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-600/10 via-purple-600/10 to-fuchsia-600/10 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#0f0f15] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="ml-2 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-center font-mono text-[11px] text-zinc-500">
            {subtitle}
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
          >
            {badge}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-white">
              {title}
            </h3>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Features — five icon cards                                          */
/* ------------------------------------------------------------------ */

function Features() {
  const items = [
    {
      icon: <Send className="size-5" />,
      title: "Collection Forms",
      body:
        "Each workspace has a public /c/<slug> form. Share the link in email, chat, or on your site and customers can submit a testimonial in under a minute.",
    },
    {
      icon: <InboxIcon className="size-5" />,
      title: "Testimonial Inbox",
      body:
        "Every submission lands in your private moderation inbox. Approve, reject, or feature with one click — no chasing customers for follow-ups.",
    },
    {
      icon: <Star className="size-5" />,
      title: "Wall of Love",
      body:
        "Approved testimonials publish to a public /c/<slug>/wall page you can share, screenshot, or link to. Clean, fast, and on-brand.",
    },
    {
      icon: <SettingsIcon className="size-5" />,
      title: "Workspace Settings",
      body:
        "One workspace per brand, product, or campaign. Tune the slug, name, description, logo, and theme color, all from the dashboard.",
    },
    {
      icon: <Code2 className="size-5" />,
      title: "Website Embed",
      body:
        "Drop a single iframe at /embed/<slug> onto any page to render your wall inline — no JavaScript SDK required.",
    },
  ];
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative border-y border-white/5 bg-white/[0.01] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Wand2 className="size-3" aria-hidden="true" />
            Features
          </span>
          <h2
            id="features-heading"
            className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Everything you need to run a Wall of Love
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-zinc-400">
            A focused feature set, built around the workflow that actually
            ships testimonials: collect, review, publish.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <li
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {f.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works — three steps                                          */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      icon: <FolderPlus className="size-5" />,
      eyebrow: "Step 1",
      title: "Create a Workspace",
      description:
        "Sign up, open the dashboard, and create a workspace. Give it a name and a public slug — that's all you need to start.",
      cta: { label: "New workspace", href: "/dashboard/workspaces/new" },
    },
    {
      icon: <Share2 className="size-5" />,
      eyebrow: "Step 2",
      title: "Share your Collection Link",
      description:
        "Send your branded /c/<slug> link to customers. They submit a testimonial — text or video, with consent — in seconds.",
      cta: { label: "See an example", href: "/sign-up" },
    },
    {
      icon: <CheckCircle2 className="size-5" />,
      eyebrow: "Step 3",
      title: "Approve & Publish",
      description:
        "Review submissions in your inbox, approve the best, and publish to your Wall of Love — or embed it anywhere with /embed/<slug>.",
      cta: { label: "Open dashboard", href: "/dashboard" },
    },
  ];
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <ListChecks className="size-3" aria-hidden="true" />
            How it works
          </span>
          <h2
            id="how-it-works-heading"
            className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            From submission to showcase in three steps
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-zinc-400">
            A simple workflow you can run end-to-end in an afternoon.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-xl hover:shadow-violet-500/10"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="relative flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30">
                  {s.icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                  {s.eyebrow}
                </span>
              </div>
              <h3 className="relative mt-4 text-lg font-semibold text-white">
                {s.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">
                {s.description}
              </p>
              <Link
                href={s.cta.href}
                className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-300 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {s.cta.label}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-zinc-700 md:block"
                >
                  <ArrowRight className="size-4" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Showcase — educational section that explains what a Wall of Love is,  */
/* how the workflow moves a testimonial from submission to publication,   */
/* and how a brand can create their own.                                 */
/*                                                                       */
/* All names and copy here are demo content for layout demonstration.    */
/* Real customer testimonials appear only on the per-workspace Wall of   */
/* Love at /c/<slug>/wall (lib/testimonials/public.ts). We never mix     */
/* demo data with real published testimonials.                           */
/* ------------------------------------------------------------------ */

function Showcase({ isSignedIn }: { isSignedIn: boolean }) {
  const primaryCtaHref = isSignedIn
    ? "/dashboard/workspaces/new"
    : "/sign-up";
  const primaryCtaLabel = isSignedIn
    ? "Open your dashboard"
    : "Create Your Wall of Love";
  return (
    <section
      id="showcase"
      aria-labelledby="showcase-heading"
      className="relative border-y border-white/5 bg-white/[0.01] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Eye className="size-3" aria-hidden="true" />
            Showcase
          </span>
          <h2
            id="showcase-heading"
            className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Showcase Your Best Customer Testimonials
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-zinc-400 sm:text-base">
            A Wall of Love is a public page where visitors can read positive
            feedback from your customers. Collect testimonials, review them,
            and publish approved feedback to build trust.
          </p>
        </div>

        {/* (1) Demo notice + (2) sample testimonial cards. */}
        <div id="showcase-demo" className="scroll-mt-24 space-y-8">
          <DemoNotice />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SAMPLE_SHOWCASE.map((t) => (
              <DemoTestimonialCard key={t.name} t={t} />
            ))}
          </div>
        </div>

        {/* (3) Private Inbox vs Public Wall — what your visitors see
            vs what you see. Nothing becomes public until the workspace
            owner both approves and publishes a submission. */}
        <div id="showcase-flow" className="scroll-mt-24 pt-20 sm:pt-24">
          <FlowPreview />
        </div>

        {/* (4) How it works, four steps. */}
        <div id="showcase-how" className="scroll-mt-24 pt-20 sm:pt-24">
          <ShowcaseHowItWorks
            isSignedIn={isSignedIn}
            primaryCtaHref={primaryCtaHref}
          />
        </div>

        {/* (5) Benefits — what you can do with a Wall of Love. */}
        <div id="showcase-benefits" className="scroll-mt-24 pt-20 sm:pt-24">
          <ShowcaseBenefits />
        </div>

        {/* (6) Final CTA. */}
        <div id="showcase-cta" className="scroll-mt-24 pt-20 sm:pt-24">
          <ShowcaseFinalCta
            isSignedIn={isSignedIn}
            primaryCtaHref={primaryCtaHref}
            primaryCtaLabel={primaryCtaLabel}
          />
        </div>
      </div>
    </section>
  );
}

/* The amber-bordered demo notice. Reused at the top of the showcase
   sample grid and again on individual cards' chip badges, so the demo
   label is impossible to miss. */
function DemoNotice() {
  return (
    <aside
      role="note"
      aria-label="Demo content notice"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-100 sm:items-center sm:p-5"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300"
      >
        <Eye className="size-3.5" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-amber-200">
          These are sample testimonials for demonstration only.
        </p>
        <p className="text-amber-100/80">
          The names, roles, and quotes below are not real customers. Real
          customer testimonials appear on each workspace&apos;s Wall of Love
          only after a customer submits them through the public{" "}
          <code className="rounded border border-amber-400/30 bg-amber-400/10 px-1 font-mono text-[12px] text-amber-200">
            /c/&lt;slug&gt;
          </code>{" "}
          form, you review them in the private Inbox, and you publish the
          ones you want visible.
        </p>
      </div>
    </aside>
  );
}

/* Sample testimonial card. Same gradient / hover language as the
   Features cards. Adds a tiny "Demo content" chip in the corner so the
   demo label is impossible to miss. */
function DemoTestimonialCard({ t }: { t: Sample }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-xl hover:shadow-violet-500/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
      />
      <span
        className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
        aria-label="Demo content"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
        />
        Demo
      </span>
      <div className="relative">
        <Stars n={t.rating} />
        <p className="mt-3 text-sm leading-relaxed text-zinc-200">
          &ldquo;{t.content}&rdquo;
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div
            aria-hidden="true"
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-semibold text-white`}
          >
            {t.initial}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{t.name}</p>
            <p className="text-xs text-zinc-500">{t.role}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* Private Inbox vs Public Wall — side-by-side. Renders two sibling
   preview cards. Uses the existing PreviewCard chrome so it matches
   the ProductPreview section above. */
function FlowPreview() {
  return (
    <div>
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <InboxIcon className="size-3" aria-hidden="true" />
          Approval &amp; publishing
        </span>
        <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          What you see vs what your visitors see
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-pretty text-sm text-zinc-400 sm:text-base">
          Every submission lands in your private Inbox first. Nothing becomes
          public until you both{" "}
          <span className="font-medium text-emerald-300">approve</span> the
          submission and{" "}
          <span className="font-medium text-violet-300">publish</span> it to
          your Wall of Love.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inbox preview. */}
        <PreviewCard
          title="Your private Inbox"
          subtitle="/dashboard/workspaces/<id>/inbox"
          badge="Pending"
          badgeTone="amber"
        >
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Submissions appear here as soon as a customer uses your{" "}
              <code className="font-mono text-[11px] text-violet-300">
                /c/&lt;slug&gt;
              </code>{" "}
              form. Only the workspace owner can see them.
            </p>
            {SAMPLE_INBOX.slice(0, 2).map((t) => (
              <article
                key={t.name}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-sm font-semibold text-white`}
                  >
                    {t.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {t.name}
                        </p>
                        <p className="text-xs text-zinc-500">{t.role}</p>
                      </div>
                      <Stars n={t.rating} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      &ldquo;{t.content}&rdquo;
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                        <Check className="size-3" /> Approve
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300">
                        <Star className="size-3" /> Feature
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-zinc-400">
                        Reject
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </PreviewCard>

        {/* Wall of Love preview. */}
        <PreviewCard
          title="Your public Wall of Love"
          subtitle="/c/<slug>/wall"
          badge="Published"
          badgeTone="emerald"
        >
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Approved + published testimonials appear here. Share, embed,
              or link to this page from your site.
            </p>
            {SAMPLE_WALL.slice(0, 2).map((t) => (
              <article
                key={t.name}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-4"
              >
                <Stars n={t.rating} />
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  &ldquo;{t.content}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div
                    aria-hidden="true"
                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-semibold text-white`}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{t.name}</p>
                    <p className="text-[11px] text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </PreviewCard>
      </div>

      <p className="mt-6 text-center text-xs uppercase tracking-wider text-zinc-600">
        Sample content — illustrative only
      </p>
    </div>
  );
}

/* Four-step "How it works" tailored for the showcase. Reuses the same
   icons and visual language as the page-level HowItWorks section but
   with concrete destinations inside the showcase flow. */
function ShowcaseHowItWorks({
  isSignedIn,
  primaryCtaHref,
}: {
  isSignedIn: boolean;
  primaryCtaHref: string;
}) {
  const steps = [
    {
      icon: <FolderPlus className="size-5" />,
      eyebrow: "Step 1",
      title: "Create a Workspace",
      description:
        "Open the dashboard and create a workspace for your brand or product. Give it a name and a unique slug — your public collection link is built from it.",
      cta: { label: "Create workspace", href: "/dashboard/workspaces/new" },
    },
    {
      icon: <Send className="size-5" />,
      eyebrow: "Step 2",
      title: "Share your Collection Link",
      description:
        "Send the public /c/<slug> link to customers in email, chat, or from your website. Customers submit a testimonial — text, optional role and company, optional star rating, plus consent.",
      cta: {
        label: isSignedIn ? "Open dashboard" : "Create an account",
        href: isSignedIn ? "/dashboard" : "/sign-up",
      },
    },
    {
      icon: <InboxIcon className="size-5" />,
      eyebrow: "Step 3",
      title: "Review in your Inbox",
      description:
        "Every submission appears in your private moderation inbox. Read each one, then approve, reject, or feature it. Nothing goes public without your decision.",
      cta: { label: "Open inbox", href: "/dashboard" },
    },
    {
      icon: <CheckCircle2 className="size-5" />,
      eyebrow: "Step 4",
      title: "Publish to your Wall of Love",
      description:
        "Approved testimonials publish to your public Wall of Love at /c/<slug>/wall. You can also embed them anywhere with /embed/<slug>.",
      cta: { label: primaryCtaHref === "/sign-up" ? "Get started" : "Open dashboard", href: primaryCtaHref },
    },
  ];
  return (
    <div>
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <ListChecks className="size-3" aria-hidden="true" />
          How it works
        </span>
        <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Four steps from a customer&apos;s words to a public wall
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-pretty text-sm text-zinc-400 sm:text-base">
          The same workflow real TestimonialHub customers use, end to end.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="relative flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30">
                {s.icon}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                {s.eyebrow}
              </span>
            </div>
            <h4 className="relative mt-4 text-base font-semibold text-white">
              {s.title}
            </h4>
            <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">
              {s.description}
            </p>
            <Link
              href={s.cta.href}
              className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-300 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {s.cta.label}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* Benefits section. One card per benefit, same visual language as the
   page-level Features. No fake analytics or invented features. */
function ShowcaseBenefits() {
  const items = [
    {
      icon: <InboxIcon className="size-5" />,
      title: "Display customer feedback in one place",
      body: "Stop hunting through email threads and chat screenshots. Every submission lands in one private inbox, ready to publish to a single, shared wall.",
    },
    {
      icon: <Check className="size-5" />,
      title: "Choose which testimonials to publish",
      body: "You stay in control. Approve the testimonials that represent your brand well, reject the ones that don\u2019t \u2014 and nothing goes public without your call.",
    },
    {
      icon: <Star className="size-5" />,
      title: "Highlight featured testimonials",
      body: "Pin your strongest testimonials to the top of the wall with one click, so the very best feedback is the first thing visitors see.",
    },
    {
      icon: <Code2 className="size-5" />,
      title: "Embed on your existing website",
      body: "Drop a single iframe at /embed/<slug> onto any page to render your wall inline \u2014 no JavaScript SDK, no extra build step, no dependency to maintain.",
    },
  ];
  return (
    <div>
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <Sparkles className="size-3" aria-hidden="true" />
          Benefits
        </span>
        <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          What a Wall of Love gives you
        </h3>
        <p className="mx-auto mt-2 max-w-2xl text-pretty text-sm text-zinc-400 sm:text-base">
          Each capability is part of the current product — no add-ons,
          no upsells, no feature gates.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => (
          <li
            key={b.title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#15151f]/80 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.06] opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30">
                {b.icon}
              </div>
              <h4 className="mt-4 text-base font-semibold text-white">
                {b.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {b.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Final CTA inside the showcase. Branches on auth state. */
function ShowcaseFinalCta({
  isSignedIn,
  primaryCtaHref,
  primaryCtaLabel,
}: {
  isSignedIn: boolean;
  primaryCtaHref: string;
  primaryCtaLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.06] via-purple-500/[0.04] to-transparent p-8 shadow-2xl shadow-violet-500/10 sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[80px]" />
      </div>
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <Megaphone className="size-3" aria-hidden="true" />
          Ready when you are
        </span>
        <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to showcase your customer love?
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-sm text-zinc-400 sm:text-base">
          {isSignedIn
            ? "Open your dashboard to manage workspaces, review submissions, and publish to your Wall of Love."
            : "Create an account, set up a workspace, and send your first collection link today."}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryCtaHref}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-7 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
          >
            {primaryCtaLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#showcase-how"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-7 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
          >
            <ListChecks className="size-4" aria-hidden="true" />
            See How It Works
          </a>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Pricing" — accurate to what's actually shipped.                     */
/* ------------------------------------------------------------------ */

function Pricing({ isSignedIn }: { isSignedIn: boolean }) {
  const ctaHref = isSignedIn ? "/dashboard/workspaces/new" : "/sign-up";
  const ctaLabel = isSignedIn ? "Create a workspace" : "Get started — it's free";
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <ListChecks className="size-3" aria-hidden="true" />
            Plans
          </span>
          <h2
            id="pricing-heading"
            className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            One simple offering, no surprises
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-zinc-400">
            TestimonialHub is currently in public beta. Everything that exists
            today is included for every account — there is no per-seat, per-testimonial, or
            feature-gated pricing yet.
          </p>
        </div>
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <article className="relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6">
            <h3 className="text-base font-semibold text-white">
              What&apos;s available today
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              All of these features are live in the current build:
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-zinc-300">
              {[
                "Email + password authentication",
                "Unlimited workspaces per account",
                "Public /c/<slug> collection form",
                "Private moderation inbox with approve / reject",
                "Public Wall of Love at /c/<slug>/wall",
                "Embeddable iframe at /embed/<slug>",
                "Workspace settings: slug, name, logo, theme color",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-violet-400">
                    <Check className="size-4" />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-500">
              Things that aren&apos;t on the roadmap today: video recording, NPS
              surveys, AI summaries, custom domains, analytics. We add them only
              when they&apos;re built, tested, and ready.
            </div>
          </article>
          <article className="relative flex flex-col overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-500/[0.06] via-purple-500/[0.04] to-transparent p-6 shadow-xl shadow-violet-500/10">
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Free during beta
            </span>
            <h3 className="text-base font-semibold text-white">
              Get started
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Create an account, set up your first workspace, and start
              collecting real testimonials today.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-white">
                $0
              </span>
              <span className="text-sm text-zinc-500">during beta</span>
            </div>
            <Link
              href={ctaHref}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
            >
              {ctaLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={isSignedIn ? "/dashboard" : "/sign-in"}
              className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
            >
              {isSignedIn ? "Open dashboard" : "I already have an account"}
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Final CTA                                                           */
/* ------------------------------------------------------------------ */

function CTASection({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-white/[0.01] py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[100px]" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          {isSignedIn
            ? "Pick up where you left off"
            : "Ready to showcase your customer love?"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-zinc-400">
          {isSignedIn
            ? "Open your dashboard to manage workspaces, review submissions, and publish to your Wall of Love."
            : "Create an account, set up a workspace, and send your first collection link today."}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-8 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition-all hover:from-violet-400 hover:to-purple-500 hover:shadow-violet-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f] sm:w-auto"
          >
            {isSignedIn ? "Open dashboard" : "Start collecting testimonials"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          {isSignedIn ? (
            <Link
              href="/dashboard/workspaces/new"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              <Plus className="size-4" />
              New workspace
            </Link>
          ) : (
            <a
              href="#showcase"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-8 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              <Eye className="size-4" />
              Explore showcase
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#08080c]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:gap-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-sm font-semibold text-zinc-200">
              TestimonialHub
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-zinc-500">
            Collect, moderate, and showcase customer testimonials. A simple
            workflow for turning feedback into social proof.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Product
          </p>
          <ul className="space-y-1.5 text-zinc-500">
            <li>
              <Link
                href="#features"
                className="transition-colors hover:text-zinc-200"
              >
                Features
              </Link>
            </li>
            <li>
              <Link
                href="#how-it-works"
                className="transition-colors hover:text-zinc-200"
              >
                How it works
              </Link>
            </li>
            <li>
              <Link
                href="#showcase"
                className="transition-colors hover:text-zinc-200"
              >
                Showcase
              </Link>
            </li>
            <li>
              <Link
                href="#pricing"
                className="transition-colors hover:text-zinc-200"
              >
                Plans
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Account
          </p>
          <ul className="space-y-1.5 text-zinc-500">
            <li>
              <Link
                href="/dashboard"
                className="transition-colors hover:text-zinc-200"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/sign-in"
                className="transition-colors hover:text-zinc-200"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/sign-up"
                className="transition-colors hover:text-zinc-200"
              >
                Create account
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:px-6">
          <p>© {FOOTER_YEAR} TestimonialHub.</p>
          <p className="text-zinc-700">Public beta · things may change.</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

function Logo() {
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

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${n} out of 5`}>
      {Array.from({ length: n }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

/* Icons used in this page (lucide-style inline SVGs to avoid adding a
   dependency — the product already uses lucide-react on other pages,
   but the homepage needs only a small set and we want to keep
   bundle size low for the marketing route). */
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Code2({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function Eye({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function FolderPlus({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}
function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function ListChecks({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M3 12h18M3 18h12" />
      <path d="M17 18l2 2 4-4" />
    </svg>
  );
}
function Megaphone({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="3 11 22 2 13 21 15 11 3 11" />
    </svg>
  );
}
function Plus({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function Send({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function Share2({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l1.91 5.91L20 11l-6.09 1.91L12 19l-1.91-6.09L4 11l6.09-2.09z" />
    </svg>
  );
}
function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function Wand2({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8L19 13" />
      <path d="M15 9h.01" />
      <path d="M17.8 6.2L19 5" />
      <path d="M3 21l9-9" />
      <path d="M12.2 6.2L11 5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sample data — illustrative only. Names are clearly demo content.   */
/* ------------------------------------------------------------------ */

type Sample = {
  name: string;
  role: string;
  content: string;
  rating: number;
  initial: string;
  color: string;
};

const SAMPLE_INBOX: Sample[] = [
  {
    name: "Sample Customer A",
    role: "VP Product, Demo Co",
    content:
      "Sample testimonial copy shown for layout purposes. This is not a real customer endorsement.",
    rating: 5,
    initial: "A",
    color: "from-pink-500 to-rose-500",
  },
  {
    name: "Sample Customer B",
    role: "Founder, Sample Inc",
    content:
      "Sample testimonial copy shown for layout purposes. Real submissions appear here after a customer uses your /c/<slug> link.",
    rating: 5,
    initial: "B",
    color: "from-violet-500 to-purple-500",
  },
  {
    name: "Sample Customer C",
    role: "Marketing Lead, Demo Co",
    content:
      "Sample testimonial copy shown for layout purposes. Approve to publish, reject to hide, feature to pin to the top of the wall.",
    rating: 5,
    initial: "C",
    color: "from-fuchsia-500 to-pink-500",
  },
];

const SAMPLE_WALL: Sample[] = [
  {
    name: "Daniel Carter",
    role: "Head of Growth, Demo Co",
    content:
      "Sample testimonial copy used to demonstrate the public Wall of Love layout.",
    rating: 5,
    initial: "D",
    color: "from-cyan-500 to-blue-500",
  },
  {
    name: "Sophia Bennett",
    role: "CEO, Sample Inc",
    content:
      "Sample testimonial copy used to demonstrate the public Wall of Love layout.",
    rating: 5,
    initial: "S",
    color: "from-violet-500 to-purple-500",
  },
  {
    name: "Arif Rahman",
    role: "VP Marketing, Demo Co",
    content:
      "Sample testimonial copy used to demonstrate the public Wall of Love layout.",
    rating: 5,
    initial: "A",
    color: "from-amber-500 to-orange-500",
  },
];

const SAMPLE_SHOWCASE: Sample[] = [
  ...SAMPLE_WALL,
  {
    name: "Olivia Brooks",
    role: "Operations, Sample Inc",
    content:
      "Sample testimonial copy used to demonstrate the showcase section. Real customers replace these with their own words once published.",
    rating: 5,
    initial: "O",
    color: "from-emerald-500 to-teal-500",
  },
];
