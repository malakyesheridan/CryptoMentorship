import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/dates'
import type { RoiDashboardPayload } from '@/lib/roi-dashboard'
import { RoiEquityChart } from './RoiEquityChart'

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function RoiDashboard({ payload }: { payload: RoiDashboardPayload }) {
  const { metrics, settings, series } = payload
  const lastUpdated = metrics.lastUpdatedAt ? formatDateTime(metrics.lastUpdatedAt) : '--'
  const asOfDate = metrics.asOfDate ?? '--'

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
    </div>
  )
}
