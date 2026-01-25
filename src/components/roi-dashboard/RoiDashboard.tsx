import { Card, CardContent } from '@/components/ui/card'
import type { RoiDashboardPayload } from '@/lib/roi-dashboard'
import { calculateRoiSinceInception } from '@/lib/roi-dashboard/metrics'
import { RoiEquityChart } from './RoiEquityChart'

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function RoiDashboard({ payload }: { payload: RoiDashboardPayload }) {
  const { metrics, settings, series } = payload
  const btcSinceInceptionPct = calculateRoiSinceInception(series.btc)
  const ethSinceInceptionPct = calculateRoiSinceInception(series.eth)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">ROI Since Tracking Started</p>
            <p className={metrics.roiSinceInceptionPct >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(metrics.roiSinceInceptionPct)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">ROI (last 30 days)</p>
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
            <p className="text-xs text-slate-500">Buy and Hold BTC</p>
            <p className={btcSinceInceptionPct >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(btcSinceInceptionPct)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Buy and Hold ETH</p>
            <p className={ethSinceInceptionPct >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(ethSinceInceptionPct)}
            </p>
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
