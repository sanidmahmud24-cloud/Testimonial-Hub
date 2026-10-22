"use client";

// Route-segment error boundary for /dashboard/*.
// Catches unexpected runtime errors thrown by the dashboard subtree
// (DB hiccup, network blip, etc.) and shows a friendly retry UI
// instead of the default Next.js crash screen.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    // Logged on the server too; this is just for the client console.
    console.error("[dashboard] route error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load your dashboard. This is usually temporary —
        please try again.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Reference: <code className="rounded bg-muted px-1.5 py-0.5">{error.digest}</code>
        </p>
      ) : null}
      <div className="flex justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
          Back to workspaces
        </Button>
      </div>
    </div>
  );
}
