import Link from 'next/link'
import { Zap, Lock, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import { parseAllocationAssets, buildAllocationSplits } from '@/lib/portfolio-assets'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'

interface Signal {
  id: string
  tier: string
  category: string | null
  riskProfile: string
  signal: string
  executiveSummary: string | null
  publishedAt: Date
}

interface DailySignalSnapshotProps {
  signals: Signal[]
  hasSubscription: boolean
  userTier: string | null
}

const tierLabels: Record<string, string> = {
  T1: 'Growth',
  T2: 'Elite',
}

const tierColors: Record<string, string> = {
  T1: 'border-purple-800/50 bg-[#1a1520]/50',
  T2: 'border-yellow-800/50 bg-[#2a2418]/50',
}

function canAccessTier(userTier: string | null, signalTier: string, isActive: boolean): boolean {
  if (!userTier || !isActive) return false
  const hierarchy = ['T1', 'T2']
  return hierarchy.indexOf(userTier) >= hierarchy.indexOf(signalTier)
}

function getSignalSummary(signal: Signal): string {
  // For majors signals, try to parse allocation assets
  if (signal.category !== 'memecoins') {
    const assets = parseAllocationAssets(signal.signal)
    if (assets) {
      return `${assets.primaryAsset} / ${assets.secondaryAsset} / ${assets.tertiaryAsset}`
    }
  }
  // For memecoins or unparseable, show first line of signal text
  const firstLine = signal.signal.split('\n')[0].trim()
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine
}

export function DailySignalSnapshot({ signals, hasSubscription, userTier }: DailySignalSnapshotProps) {
  if (signals.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text-strong)]">Daily Update</h2>
        </div>
        <DashboardEmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="No daily updates yet"
          description="Check back later for today's portfolio updates."
        />
      </section>
    )
  }

  // Deduplicate: one signal per tier+category combo (most recent)
  const seen = new Set<string>()
  const uniqueSignals = signals.filter((s) => {
    const key = `${s.tier}-${s.category ?? 'default'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--text-strong)]">Daily Update</h2>
        <Link
          href="/portfolio"
          className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors"
        >
          View Portfolio
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {uniqueSignals.map((signal) => {
          const hasAccess = canAccessTier(userTier, signal.tier, hasSubscription)
          const isLocked = !hasAccess
          const summary = getSignalSummary(signal)
          const categoryLabel = signal.category === 'majors'
            ? 'Market Rotation'
            : signal.category === 'memecoins'
              ? 'Memecoins'
              : ''

          return (
            <Link
              key={signal.id}
              href="/portfolio"
              className="group block"
            >
              <Card className={`border ${tierColors[signal.tier] ?? 'border-[var(--border-subtle)]'} hover:border-gold-400/40 transition-all duration-200`}>
                <CardContent className="pt-5 pb-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-[var(--text-strong)]">
                        {tierLabels[signal.tier] ?? signal.tier}
                      </span>
                      {categoryLabel && (
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(signal.publishedAt, 'short')}
                    </span>
                  </div>

                  {isLocked ? (
                    <div className="flex items-center gap-3 py-3">
                      <Lock className="h-5 w-5 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-strong)]">Locked</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Upgrade to {tierLabels[signal.tier]} to view
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Signal summary */}
                      <p className="text-lg font-bold text-[var(--text-strong)] mb-2">
                        {summary}
                      </p>

                      {/* Executive summary preview */}
                      {signal.executiveSummary && (
                        <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                          {signal.executiveSummary}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
