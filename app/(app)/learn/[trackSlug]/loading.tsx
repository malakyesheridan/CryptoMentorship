export default function TrackDetailLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
        {/* Back button */}
        <div className="mb-4">
          <div className="h-8 w-28 bg-[var(--bg-skeleton)] rounded" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              {/* Cover image */}
              <div className="aspect-video bg-[var(--bg-skeleton)]" />
              <div className="p-4 space-y-3">
                {/* Title */}
                <div className="h-6 bg-[var(--bg-skeleton)] rounded w-3/4" />
                {/* Summary */}
                <div className="space-y-1.5">
                  <div className="h-3 bg-[var(--bg-skeleton)] rounded w-full" />
                  <div className="h-3 bg-[var(--bg-skeleton)] rounded w-5/6" />
                </div>
                {/* Stats */}
                <div className="flex gap-4">
                  <div className="h-3 w-20 bg-[var(--bg-skeleton)] rounded" />
                  <div className="h-3 w-16 bg-[var(--bg-skeleton)] rounded" />
                </div>
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="h-3 w-24 bg-[var(--bg-skeleton)] rounded" />
                    <div className="h-3 w-8 bg-[var(--bg-skeleton)] rounded" />
                  </div>
                  <div className="w-full bg-[var(--bg-skeleton)] rounded-full h-1.5" />
                </div>
                {/* CTA button */}
                <div className="h-9 bg-[var(--bg-skeleton)] rounded-md" />
              </div>
            </div>
          </aside>

          {/* Main Content — Lesson List */}
          <main className="flex-1 min-w-0">
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
              <div className="p-5 border-b border-[var(--border-subtle)]">
                <div className="h-6 w-24 bg-[var(--bg-skeleton)] rounded" />
                <div className="h-3 w-40 bg-[var(--bg-skeleton)] rounded mt-2" />
              </div>
              {/* Section header */}
              <div className="px-5 py-3 bg-[var(--bg-hover)]">
                <div className="h-4 w-32 bg-[var(--bg-skeleton)] rounded" />
              </div>
              {/* Lesson rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--bg-skeleton)] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-4 bg-[var(--bg-skeleton)] rounded w-2/3" />
                      <div className="h-3 bg-[var(--bg-skeleton)] rounded w-16" />
                    </div>
                    <div className="h-4 w-4 bg-[var(--bg-skeleton)] rounded shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
