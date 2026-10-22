// Streaming skeleton for the public Wall of Love. Used while the
// workspace lookup + testimonial query resolve. Mirrors the dark-purple
// hero and card layout of wall/page.tsx so streaming never flashes a
// light page.

export default function WallOfLoveLoading() {
  return (
    <div className="dark">
      <div
        className="relative min-h-screen bg-[#0a0a0f] text-white"
        aria-busy="true"
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-48 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
          <div className="absolute top-10 right-0 h-[420px] w-[420px] rounded-full bg-purple-600/20 blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 py-4">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-white/10" />
            <div className="h-9 w-32 animate-pulse rounded-lg bg-white/10" />
          </div>

          {/* Hero */}
          <div className="flex flex-col items-center pt-14 pb-12 text-center sm:pt-20 sm:pb-16">
            <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="mt-6 h-12 w-80 max-w-full animate-pulse rounded-xl bg-white/10 sm:h-14" />
            <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-white/10" />
            <div className="mt-8 flex gap-3">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-white/10" />
              <div className="h-9 w-32 animate-pulse rounded-lg bg-white/10" />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/20"
              >
                <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                  <div className="size-10 shrink-0 animate-pulse rounded-full bg-white/10" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}