export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-[#1a1815]">
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-4">
              {/* Back button */}
              <div className="h-8 w-28 bg-[#2a2520] rounded" />
              {/* Track title */}
              <div className="h-5 bg-[#2a2520] rounded w-3/4" />
              {/* Progress bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <div className="h-3 w-20 bg-[#2a2520] rounded" />
                  <div className="h-3 w-8 bg-[#2a2520] rounded" />
                </div>
                <div className="w-full bg-[#2a2520] rounded-full h-1.5" />
              </div>
            </div>
            {/* Lesson list */}
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 py-2">
                  <div className="h-5 w-5 rounded-full bg-[#2a2520] shrink-0" />
                  <div className="h-3 bg-[#2a2520] rounded flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Video player placeholder */}
            <div className="aspect-video bg-[#2a2520] rounded-xl" />
            {/* Title area */}
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] p-6 space-y-4">
              <div className="h-7 bg-[#2a2520] rounded w-2/3" />
              <div className="flex gap-3">
                <div className="h-3 w-16 bg-[#2a2520] rounded" />
                <div className="h-3 w-20 bg-[#2a2520] rounded" />
              </div>
              {/* Content lines */}
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-[#2a2520] rounded w-full" />
                <div className="h-3 bg-[#2a2520] rounded w-5/6" />
                <div className="h-3 bg-[#2a2520] rounded w-4/6" />
                <div className="h-3 bg-[#2a2520] rounded w-full" />
                <div className="h-3 bg-[#2a2520] rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
