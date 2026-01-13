'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { RoiEquityChart } from '@/components/roi-dashboard/RoiEquityChart'

type RoiResponse = {
  portfolioKey: string
  navSeries: Array<{ date: string; nav: number }>
  kpis: {
    roi_inception: number | null
    roi_30d: number | null
    max_drawdown: number | null
    as_of_date: string | null
  } | null
  lastRebalance: {
    effective_date: string
    allocations: Array<{ asset: string; weight: number }>
  } | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function computeKpis(navSeries: Array<{ date: string; nav: number }>) {
  if (navSeries.length === 0) {
    return { roiInception: null, roi30d: null, maxDrawdown: null }
  }

  const first = navSeries[0].nav
  const last = navSeries[navSeries.length - 1].nav
  const roiInception = first > 0 ? ((last / first) - 1) * 100 : null

  const lastDate = new Date(`${navSeries[navSeries.length - 1].date}T00:00:00.000Z`)
  const lookback = new Date(lastDate)
  lookback.setUTCDate(lookback.getUTCDate() - 30)
  const lookbackPoint = navSeries.find((point) => new Date(`${point.date}T00:00:00.000Z`) >= lookback) ?? navSeries[0]
  const roi30d = lookbackPoint.nav > 0 ? ((last / lookbackPoint.nav) - 1) * 100 : null

  let peak = navSeries[0].nav
  let maxDrawdown = 0
  for (const point of navSeries) {
    if (point.nav > peak) {
      peak = point.nav
    }
    const drawdown = ((point.nav / peak) - 1) * 100
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return { roiInception, roi30d, maxDrawdown }
}

export function PortfolioRoiPanel() {
  const { data, error, isLoading } = useSWR<RoiResponse>(
    '/api/roi?range=all',
    fetcher,
    { revalidateOnFocus: false }
  )

  if (isLoading) {
    return (
      <div className="card p-6 text-center text-slate-500">
        Loading portfolio performance…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-center text-slate-500">
        ROI data is not available yet. Please check back soon.
      </div>
    )
  }

  if (data.navSeries.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-500">
        ROI data is not available yet. Please check back soon.
      </div>
    )
  }

  const modelSeries = data.navSeries.map((point) => ({
    date: point.date,
    value: point.nav
  }))

  const computed = computeKpis(data.navSeries)
  const roiInception = data.kpis?.roi_inception ?? computed.roiInception
  const roi30d = data.kpis?.roi_30d ?? computed.roi30d
  const maxDrawdown = data.kpis?.max_drawdown ?? computed.maxDrawdown
  const asOfDate = data.kpis?.as_of_date ?? data.lastRebalance?.effective_date ?? null

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Model ROI Since Inception</p>
            <p className={roiInception !== null && roiInception >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(roiInception)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Model ROI Last 30 Days</p>
            <p className={roi30d !== null && roi30d >= 0 ? 'text-xl font-semibold text-green-600' : 'text-xl font-semibold text-red-600'}>
              {formatPercent(roi30d)}
            </p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Max Drawdown</p>
            <p className="text-xl font-semibold text-red-600">{formatPercent(maxDrawdown)}</p>
          </CardContent>
        </Card>
        <Card className="card">
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">As of</p>
            <p className="text-xl font-semibold text-slate-800">{asOfDate ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <RoiEquityChart
        modelSeries={modelSeries}
        btcSeries={[]}
        ethSeries={[]}
        showBtcDefault={false}
        showEthDefault={false}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>
          Last update posted: {data.lastRebalance?.effective_date ?? '—'}
        </span>
        <Link href="/portfolio" className="text-yellow-600 hover:text-yellow-700 font-medium">
          View My Portfolio →
        </Link>
      </div>
    </div>
  )
}
