export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-10 w-64 bg-[#2a2520] rounded" />
        <div className="h-4 w-48 bg-[#2a2520] rounded mt-3" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[#2a2520] rounded" />
                <div className="h-7 w-16 bg-[#2a2520] rounded" />
                <div className="h-2.5 w-20 bg-[#2a2520] rounded" />
              </div>
              <div className="h-8 w-8 bg-[#2a2520] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-8 px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="h-3 w-32 bg-[#2a2520] rounded" />
          <div className="h-3 w-20 bg-[#2a2520] rounded" />
          <div className="h-3 w-20 bg-[#2a2520] rounded" />
          <div className="h-3 w-24 bg-[#2a2520] rounded" />
          <div className="h-3 w-20 bg-[#2a2520] rounded" />
          <div className="ml-auto h-3 w-16 bg-[#2a2520] rounded" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 px-6 py-5 border-b border-[var(--border-subtle)] last:border-0"
          >
            <div className="flex items-center gap-3 w-32">
              <div className="h-4 w-full bg-[#2a2520] rounded" />
            </div>
            <div className="h-4 w-20 bg-[#2a2520] rounded" />
            <div className="h-5 w-16 bg-[#2a2520] rounded-full" />
            <div className="h-4 w-24 bg-[#2a2520] rounded" />
            <div className="h-4 w-20 bg-[#2a2520] rounded" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-8 bg-[#2a2520] rounded" />
              <div className="h-8 w-8 bg-[#2a2520] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
