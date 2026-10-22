// Streaming skeleton for the inbox. Shown while testimonials + tags
// load. Mirrors the page chrome (heading + filter row + tag chips + a
// couple of testimonial cards) so the layout doesn't shift when data
// arrives.

export default function InboxLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-1 rounded-lg border bg-card p-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
      <div className="h-9 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 flex gap-2">
              {[0, 1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-7 w-20 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
