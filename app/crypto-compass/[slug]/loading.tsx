export default function EpisodeLoading() {
  return (
    <div className="container-main section-padding animate-pulse">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-10 bg-[#2a2520] rounded" />
        <div className="h-3 w-2 bg-[#2a2520] rounded" />
        <div className="h-3 w-28 bg-[#2a2520] rounded" />
        <div className="h-3 w-2 bg-[#2a2520] rounded" />
        <div className="h-3 w-36 bg-[#2a2520] rounded" />
      </div>

      {/* Back button */}
      <div className="mb-6">
        <div className="h-8 w-20 bg-[#2a2520] rounded" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-6 w-20 bg-[#2a2520] rounded-full" />
          </div>
          <div className="h-10 w-3/4 bg-[#2a2520] rounded mb-3" />
          <div className="h-4 w-40 bg-[#2a2520] rounded" />
        </div>

        {/* Video player placeholder */}
        <div className="aspect-video bg-[#2a2520] rounded-xl mb-8" />
      </div>

      {/* Content area */}
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="h-5 bg-[#2a2520] rounded w-full" />
        <div className="h-5 bg-[#2a2520] rounded w-5/6" />
        <div className="h-5 bg-[#2a2520] rounded w-full" />
        <div className="h-5 bg-[#2a2520] rounded w-4/6" />
        <div className="h-5 bg-[#2a2520] rounded w-full" />
        <div className="h-5 bg-[#2a2520] rounded w-3/4" />

        {/* Prev/Next nav */}
        <div className="flex gap-4 mt-12 pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-2">
            <div className="h-3 w-24 bg-[#2a2520] rounded" />
            <div className="h-4 w-3/4 bg-[#2a2520] rounded" />
          </div>
          <div className="flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-2">
            <div className="h-3 w-24 bg-[#2a2520] rounded ml-auto" />
            <div className="h-4 w-3/4 bg-[#2a2520] rounded ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
