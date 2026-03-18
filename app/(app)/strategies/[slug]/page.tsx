import { notFound } from 'next/navigation'
import { getStrategyBySlug, getEquityCurve, getStrategyUpdates } from '@/lib/strategies/queries'
import { STRATEGY_TYPE_LABELS } from '@/lib/strategies/constants'
import { HoldingsTable } from '@/components/strategies/HoldingsTable'
import { AllocationDonut } from '@/components/strategies/AllocationDonut'
import { PerformanceStats } from '@/components/strategies/PerformanceStats'
import { StrategyEquityCurve } from '@/components/strategies/StrategyEquityCurve'
import { StrategyUpdateFeed } from '@/components/strategies/StrategyUpdateFeed'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 300

interface StrategyDetailPageProps {
  params: { slug: string }
}

export default async function StrategyDetailPage({ params }: StrategyDetailPageProps) {
  const strategy = await getStrategyBySlug(params.slug)

  if (!strategy) {
    notFound()
  }

  const [equityCurve, updates] = await Promise.all([
    getEquityCurve(strategy.id),
    getStrategyUpdates(strategy.id),
  ])

  // Parse JSON fields from the latest snapshot
  const latestSnapshot = strategy.snapshots?.[0] ?? null
  const holdingsJson = latestSnapshot?.holdingsJson
    ? (typeof latestSnapshot.holdingsJson === 'string'
        ? JSON.parse(latestSnapshot.holdingsJson)
        : latestSnapshot.holdingsJson)
    : []
  const performanceJson = latestSnapshot?.performanceJson
    ? (typeof latestSnapshot.performanceJson === 'string'
        ? JSON.parse(latestSnapshot.performanceJson)
        : latestSnapshot.performanceJson)
    : {}

  const typeLabel = STRATEGY_TYPE_LABELS[strategy.type] ?? strategy.type
  const lastUpdated = latestSnapshot?.date
    ? new Date(latestSnapshot.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A'

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Header */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <Link
          href="/strategies"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Strategies
        </Link>

        <div className="flex flex-wrap items-center gap-4 mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-strong)]">
            {strategy.name}
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--gold-400)]/15 text-[var(--gold-400)] border border-[var(--gold-400)]/30">
            {typeLabel}
          </span>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          Last updated: {lastUpdated}
        </p>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Two-column layout: Holdings + Allocation | Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
              <HoldingsTable holdingsJson={holdingsJson} />
            </div>
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
              <AllocationDonut holdings={holdingsJson} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
              <PerformanceStats performanceJson={performanceJson} />
            </div>
          </div>
        </div>

        {/* Equity Curve - full width */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
          <StrategyEquityCurve equityCurve={equityCurve.map((p) => ({
            date: p.date.toISOString(),
            equityValue: Number(p.equityValue),
            dominantAsset: p.dominantAsset ?? 'BTC',
            dailyReturn: p.dailyReturn ? Number(p.dailyReturn) : 0,
          }))} />
        </div>

        {/* Update Feed */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6">
          <StrategyUpdateFeed updates={updates.map((u) => ({
            ...u,
            date: u.date.toISOString(),
            createdAt: u.createdAt.toISOString(),
          }))} />
        </div>
      </div>
    </div>
  )
}
