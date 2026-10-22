"use client";

// Error boundary for /embed/<slug> pages. Designed to render inside an
// iframe on a third-party site, so keep the chrome minimal and avoid
// pulling in any project components that depend on the root layout.

import { useEffect } from "react";

export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[embed] route error", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background p-4 font-sans text-foreground">
      <div className="mx-auto max-w-sm space-y-3 text-center">
        <p className="text-sm font-medium">Couldn&apos;t load testimonials</p>
        <p className="text-xs text-muted-foreground">
          The embed failed to load. Reload the parent page to retry.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
