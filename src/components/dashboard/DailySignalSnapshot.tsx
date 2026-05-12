import Link from 'next/link'
import { Zap, ArrowRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/dates'
import { parseAllocationAssets, getAssetDisplayLabel } from '@/lib/portfolio-assets'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'
import { brandName } from '@/lib/brand'
import { getSystem } from '@/lib/system-registry'

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

function getSignalSummary(signal: Signal): string {
  const assets = parseAllocationAssets(signal.signal)
  if (assets) {
    return `${getAssetDisplayLabel(assets.primaryAsset)} / ${getAssetDisplayLabel(assets.secondaryAsset)} / ${getAssetDisplayLabel(assets.tertiaryAsset)}`
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {signals.map((signal) => {
          const slug = signal.category ?? ''
          const system = getSystem(slug)
          const accent = system?.color ?? 'var(--gold-400)'
          const label = system ? brandName(slug) : (slug.toUpperCase() || 'Signal')
          const summary = hasSubscription ? getSignalSummary(signal) : null

          return (
            <Link
              key={signal.id}
              href={`/portfolio#${slug}`}
              className="group block"
            >
              <Card
                className="border-l-4 hover:border-gold-400/40 transition-all duration-200"
                style={{ borderLeftColor: accent }}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Zap className="h-4 w-4 shrink-0" style={{ color: accent }} />
                      <span
                        className="text-xs font-semibold uppercase tracking-wider truncate"
                        style={{ color: accent }}
                      >
                        {label}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
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
