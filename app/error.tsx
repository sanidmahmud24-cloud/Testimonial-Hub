"use client";

// Global error boundary. Catches anything that escapes the per-route
// error.tsx files. Renders inside the root layout, so we can use the
// project design system.

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          We hit an unexpected error
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The error has been logged. You can retry, or head back to the home
          page and try again.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
