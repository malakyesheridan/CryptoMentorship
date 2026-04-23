import Link from 'next/link'
import { Zap, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/dates'
import { parseAllocationAssets, getAssetDisplayLabel } from '@/lib/portfolio-assets'
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
}

type CategoryKey = 'majors' | 'memecoins'

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  majors: 'Market Rotation',
  memecoins: 'Memecoins',
}

const CATEGORY_STYLES: Record<CategoryKey, string> = {
  majors: 'border-amber-500/30 bg-amber-500/10',
  memecoins: 'border-purple-500/30 bg-purple-500/10',
}

function normaliseCategory(signal: Signal): CategoryKey {
  return signal.category === 'memecoins' ? 'memecoins' : 'majors'
}

function getSignalSummary(signal: Signal): string {
  if (signal.category !== 'memecoins') {
    const assets = parseAllocationAssets(signal.signal)
    if (assets) {
      return `${getAssetDisplayLabel(assets.primaryAsset)} / ${getAssetDisplayLabel(assets.secondaryAsset)} / ${getAssetDisplayLabel(assets.tertiaryAsset)}`
    }
  }
  const firstLine = signal.signal.split('\n')[0].trim()
  return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine
}

export function DailySignalSnapshot({ signals, hasSubscription }: DailySignalSnapshotProps) {
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

  // Deduplicate: one signal per category (most recent wins since server already
  // sorts by publishedAt desc).
  const seen = new Set<CategoryKey>()
  const uniqueSignals = signals.filter((signal) => {
    const category = normaliseCategory(signal)
    if (seen.has(category)) return false
    seen.add(category)
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
          const category = normaliseCategory(signal)
          const summary = hasSubscription ? getSignalSummary(signal) : null

          return (
            <Link
              key={signal.id}
              href="/portfolio"
              className="group block"
            >
              <Card className={`border ${CATEGORY_STYLES[category]} hover:border-gold-400/40 transition-all duration-200`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[category]}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(signal.publishedAt, 'short')}
                    </span>
                  </div>

                  {summary && (
                    <>
                      <p className="text-lg font-bold text-[var(--text-strong)] mb-2">
                        {summary}
                      </p>
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
