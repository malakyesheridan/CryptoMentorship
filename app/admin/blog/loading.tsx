export default function Loading() {
  return (
    <div className="container-main section-padding animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-[var(--bg-skeleton)] rounded mb-2" />
        <div className="h-5 w-80 bg-[var(--bg-skeleton)] rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6">
            <div className="h-4 w-24 bg-[var(--bg-skeleton)] rounded mb-2" />
            <div className="h-8 w-16 bg-[var(--bg-skeleton)] rounded" />
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-6">
        <div className="h-10 w-36 bg-[var(--bg-skeleton)] rounded" />
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-subtle)] last:border-0">
            <div className="flex-1">
              <div className="h-4 w-64 bg-[var(--bg-skeleton)] rounded mb-1" />
              <div className="h-3 w-40 bg-[var(--bg-skeleton)] rounded" />
            </div>
            <div className="h-6 w-24 bg-[var(--bg-skeleton)] rounded" />
            <div className="h-6 w-20 bg-[var(--bg-skeleton)] rounded" />
            <div className="h-8 w-16 bg-[var(--bg-skeleton)] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
