// Streaming skeleton for the iframe embed. Stays inside the embed's
// minimal chrome so the parent page doesn't reflow when content lands.

export default function EmbedLoading() {
  return (
    <div
      className="min-h-screen bg-background p-4 font-sans text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex gap-0.5">
              {[0, 1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="size-3 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
