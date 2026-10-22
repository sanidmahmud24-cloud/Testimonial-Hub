import Link from "next/link";

// Global 404. Renders inside the root layout (header/footer from
// individual routes are not present here because no segment above the
// root owns a layout). Kept branded and useful: search the wall, jump
// home, or sign in to manage your own.

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The link may be broken, or the testimonial was removed by its
          owner. Try one of the options below.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
