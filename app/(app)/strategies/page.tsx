import { getActiveStrategies } from '@/lib/strategies/queries'
import { StrategyCard } from '@/components/strategies/StrategyCard'

export const revalidate = 300

export default async function StrategiesPage() {
  const strategies = await getActiveStrategies()

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-white">Our </span>
              <span className="text-yellow-400">Strategies</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 px-4">
              Explore actively managed crypto strategies with transparent performance tracking.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {strategies.length === 0 ? (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-12 text-center">
            <p className="text-[var(--text-muted)] text-lg">
              No active strategies at the moment. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy: Awaited<ReturnType<typeof getActiveStrategies>>[number]) => {
              const latestSnapshot = strategy.snapshots?.[0] ?? null
              const mapped = {
                name: strategy.name,
                slug: strategy.slug,
                type: strategy.type,
                latestSnapshot: latestSnapshot
                  ? {
                      performanceJson: typeof latestSnapshot.performanceJson === 'string'
                        ? JSON.parse(latestSnapshot.performanceJson)
                        : latestSnapshot.performanceJson,
                      dominantAsset: latestSnapshot.dominantAsset ?? 'BTC',
                      equityValue: Number(latestSnapshot.equityValue),
                    }
                  : null,
                equityCurve: strategy.equityCurve.map((p) => ({
                  date: p.date.toISOString(),
                  equityValue: Number(p.equityValue),
                })),
              }
              return <StrategyCard key={strategy.id} strategy={mapped} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}
