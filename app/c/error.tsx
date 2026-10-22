"use client";

// Error boundary for the /c/* public surface (collection, wall, thanks).
// Surfaces a friendly retry UI when the database or the workspace lookup
// throws unexpectedly. notFound() cases are handled by not-found.tsx in
// the same segment, so this only fires for real errors.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PublicCollectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error("[c] route error", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          We hit a snag loading this page
        </h1>
        <p className="text-sm text-muted-foreground">
          Please try again in a moment.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Reference:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">{error.digest}</code>
          </p>
        ) : null}
        <div className="flex justify-center gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
          >
            Home
          </Button>
        </div>
      </div>
    </main>
  );
}
