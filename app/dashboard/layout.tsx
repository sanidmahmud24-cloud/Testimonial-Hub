import Link from "next/link";
import { Suspense } from "react";
import { LogOut, LayoutDashboard, Mail } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";

// Module-scope server action. Hoisting it out of the layout component
// body avoids creating a fresh action reference on every render — the
// previous closure was being recreated on each layout render, which
// subtly affected RSC diffing (especially under prefetch).
async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Dashboard is now dark by default so every sub-page (workspaces,
    // settings, inbox, embed, etc.) inherits the homepage's visual
    // language. Per-page overrides are still possible via prose/dark.
    <div className="dark flex min-h-full flex-1 flex-col bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-white"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-500/30"
            >
              <LayoutDashboard className="size-4 text-white" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              TestimonialHub
            </span>
          </Link>

          {/* The session read lives inside a <Suspense> boundary rather
              than at the layout's top level. A top-level await on the
              session holds the entire segment — including {children} —
              behind the request, which is what blocked /dashboard from
              prerendering. requireUser() is unchanged, so the auth gate
              and redirect still apply. */}
          <Suspense fallback={<AuthActionsSkeleton />}>
            <AccountActions />
          </Suspense>
        </div>
      </header>

      {/* Background gradient orbs — same palette as the homepage Hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-14 z-0 h-[420px] overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute right-0 top-10 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute left-0 top-20 h-[300px] w-[300px] rounded-full bg-fuchsia-600/8 blur-[80px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

/**
 * The signed-in user's email + sign-out control — the only part of the
 * dashboard chrome that needs the session, so it sits in its own
 * boundary. `requireUser()` is preserved verbatim: an unauthenticated
 * request still redirects to /sign-in, and proxy.ts continues to gate
 * /dashboard before render. The redirect throws, so it is never
 * swallowed by the boundary.
 */
async function AccountActions() {
  const user = await requireUser();

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span
        className="hidden items-center gap-1.5 truncate rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 sm:inline-flex"
        title={user.email}
      >
        <Mail className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
        <span className="max-w-[12rem] truncate">{user.email}</span>
      </span>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          <span>Sign out</span>
        </Button>
      </form>
    </div>
  );
}

/**
 * Placeholder shipped in the static shell so the header renders
 * instantly while the session streams in. Same footprint as the real
 * control so the layout does not shift when it swaps in.
 */
function AuthActionsSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 sm:gap-3">
      <div className="hidden h-[30px] w-40 animate-pulse rounded-md bg-white/5 sm:block" />
      <div className="h-9 w-[104px] animate-pulse rounded-lg bg-white/5" />
    </div>
  );
}
