export default function CryptoCompassLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-8 w-56 bg-[#2a2520] rounded" />
              <div className="h-3 w-72 bg-[#2a2520] rounded mt-2" />
            </div>
            <div className="h-10 w-32 bg-[#2a2520] rounded-md shrink-0" />
          </div>

          {/* Search + filters */}
          <div className="flex gap-3">
            <div className="h-10 bg-[#2a2520] rounded-lg flex-1" />
            <div className="h-10 w-32 bg-[#2a2520] rounded-lg" />
            <div className="h-10 w-28 bg-[#2a2520] rounded-lg" />
          </div>

          {/* Episode grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="aspect-video bg-[#2a2520]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-[#2a2520] rounded w-3/4" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-[#2a2520] rounded w-full" />
                    <div className="h-3 bg-[#2a2520] rounded w-2/3" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-3 w-16 bg-[#2a2520] rounded" />
                    <div className="h-3 w-20 bg-[#2a2520] rounded" />
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
