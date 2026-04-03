export default function Loading() {
  return (
    <div className="container-main section-padding animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-32 bg-[#2a2520] rounded mb-2" />
        <div className="h-5 w-72 bg-[#2a2520] rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-hidden">
            <div className="aspect-video bg-[#2a2520]" />
            <div className="p-6 space-y-3">
              <div className="h-5 w-24 bg-[#2a2520] rounded" />
              <div className="h-6 w-3/4 bg-[#2a2520] rounded" />
              <div className="h-4 w-full bg-[#2a2520] rounded" />
              <div className="h-3 w-40 bg-[#2a2520] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
