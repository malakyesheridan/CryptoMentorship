export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Welcome header */}
        <div className="space-y-2">
          <div className="h-9 w-64 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-20 bg-[var(--bg-skeleton)] rounded-full animate-pulse" />
            <div className="h-4 w-40 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          </div>
        </div>

        {/* Episode hero */}
        <div className="h-64 sm:h-72 lg:h-80 w-full bg-[var(--bg-skeleton)] rounded-2xl animate-pulse" />

        {/* Daily signal snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-36 bg-[var(--bg-skeleton)] rounded animate-pulse" />
            <div className="h-4 w-28 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[var(--bg-skeleton)] rounded-xl p-5 animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-[var(--bg-hover)] rounded" />
                    <div className="h-4 w-16 bg-[var(--bg-hover)] rounded" />
                  </div>
                  <div className="h-3 w-20 bg-[var(--bg-hover)] rounded" />
                </div>
                <div className="h-6 w-40 bg-[var(--bg-hover)] rounded" />
                <div className="h-4 w-full bg-[var(--bg-hover)] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Announcements section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-44 bg-[var(--bg-skeleton)] rounded animate-pulse" />
            <div className="h-4 w-20 bg-[var(--bg-skeleton)] rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--bg-skeleton)] rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[var(--bg-hover)] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 bg-[var(--bg-hover)] rounded" />
                    <div className="h-4 w-full bg-[var(--bg-hover)] rounded" />
                    <div className="h-4 w-3/4 bg-[var(--bg-hover)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
