// Streaming skeleton for the /dashboard route. Shown immediately while
// the workspace list query runs. The actual layout (header) is rendered
// by app/dashboard/layout.tsx before this kicks in.

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="rounded-lg border p-4"
          >
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
