export default function SystemsLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="h-8 w-40 animate-pulse rounded bg-[#2a2520]" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-[#2a2520]" />
          </div>
          <div className="h-6 w-32 animate-pulse rounded bg-[#2a2520]" />
        </div>
        <div className="mb-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded bg-[#2a2520]" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-[#2a2520]" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-[#2a2520]" />
            <div className="h-64 animate-pulse rounded-2xl bg-[#2a2520]" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-[#2a2520]" />
        </div>
      </div>
    </div>
  );
}
