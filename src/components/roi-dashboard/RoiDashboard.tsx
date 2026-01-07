import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import type { RoiDashboardPayload } from '@/lib/roi-dashboard'
import { RoiEquityChart } from './RoiEquityChart'
import { RoiSimulator } from './RoiSimulator'
import { RoiAllocationChart } from './RoiAllocationChart'

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function RoiDashboard({ payload }: { payload: RoiDashboardPayload }) {
  const { metrics, settings, series, allocation, changeLogEvents } = payload
  const lastUpdated = metrics.lastUpdatedAt ? formatDateTime(metrics.lastUpdatedAt) : '--'
  const asOfDate = metrics.asOfDate ?? '--'

  const lastModelDate = series.model[series.model.length - 1]?.date
  const inceptionDate = settings.inceptionDate
  const defaultStartDate = (() => {
    if (!lastModelDate) return inceptionDate
    const lastDate = new Date(`${lastModelDate}T00:00:00.000Z`)
    const oneYearAgo = new Date(lastDate.getTime() - 365 * 24 * 60 * 60 * 1000)
    const inception = new Date(`${inceptionDate}T00:00:00.000Z`)
    return (oneYearAgo.getTime() > inception.getTime() ? oneYearAgo : inception).toISOString().split('T')[0]
  })()

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Model ROI Since Inception</p>
            <p className={metrics.roiSinceInceptionPct >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(metrics.roiSinceInceptionPct)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Model ROI Last 30 Days</p>
            <p className={metrics.roiLast30DaysPct >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(metrics.roiLast30DaysPct)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Max Drawdown</p>
            <p className="text-xl font-semibold text-red-600">{formatPercent(metrics.maxDrawdownPct)}</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Current Allocation</p>
            <p className="text-base font-semibold text-slate-900">
              {metrics.investedPct.toFixed(1)}% invested
            </p>
            <p className="text-xs text-slate-500">{metrics.cashPct.toFixed(1)}% cash/stables</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Last Updated</p>
            <p className="text-sm font-semibold text-slate-900">{lastUpdated}</p>
            <p className="text-xs text-slate-500">As of {asOfDate}</p>
          </CardContent>
        </Card>
      </div>

      <RoiEquityChart
        modelSeries={series.model}
        btcSeries={series.btc}
        ethSeries={series.eth}
        showBtcDefault={settings.showBtcBenchmark}
        showEthDefault={settings.showEthBenchmark}
      />

      {settings.showSimulator && (
        <RoiSimulator
          modelSeries={series.model}
          defaultStartDate={defaultStartDate}
          disclaimerText={settings.disclaimerText}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.showChangeLog && (
          <Card className="card">
            <CardHeader>
              <CardTitle>What Changed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {changeLogEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No updates yet.</p>
              ) : (
                <div className="space-y-3">
                  {changeLogEvents.map((event) => (
                    <div key={event.id} className="border-b border-[color:var(--border-subtle)] pb-3 last:border-b-0">
                      <p className="text-xs text-slate-500">{event.date}</p>
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-600">{event.summary}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-sm text-slate-600">
                <Link href="/portfolio" className="text-gold-600 font-semibold">
                  Go to My Portfolio {'>'}
                </Link>
                <p className="text-xs text-slate-500 mt-1">Change log only, not trading signals.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {settings.showAllocation && <RoiAllocationChart allocation={allocation} />}
      </div>
    </div>
  )
}
