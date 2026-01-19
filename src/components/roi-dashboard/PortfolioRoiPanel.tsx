'use client'

import React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { RoiEquityChart } from '@/components/roi-dashboard/RoiEquityChart'

type RoiResponse = {
  portfolioKey: string
  status: 'ok' | 'updating' | 'stale' | 'error'
  needsRecompute: boolean
  asOfDate: string | null
  lastComputedAt: string | null
  lastSignalDate: string | null
  lastPriceDate: string | null
  primarySymbol: string | null
  primaryTicker: string | null
  lastError?: string | null
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

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to load ROI data')
  }
  return res.json()
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '--'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function dateKeyToDate(dateKey: string | null) {
  if (!dateKey) return null
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function shouldPollRoi(data: RoiResponse) {
  if (data.needsRecompute) return true
  const today = dateKeyToDate(new Date().toISOString().slice(0, 10))
  const asOfDate = dateKeyToDate(data.asOfDate)
  if (today && asOfDate && asOfDate < today) return true
  if (data.navSeries.length === 0 && data.lastSignalDate) return true
  return false
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
  const { data, error, isLoading, mutate } = useSWR<RoiResponse>(
    '/api/roi?range=all',
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const status = data?.status ?? 'updating'
  const showStatusBadge = status === 'updating' || status === 'stale'
  const pollingEnabled = data ? shouldPollRoi(data) : false
  const primaryLabel = data?.primaryTicker ? `Primary: ${data.primaryTicker}` : null

  React.useEffect(() => {
    if (!pollingEnabled) return
    const intervalId = setInterval(() => {
      void mutate()
    }, 30 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [mutate, pollingEnabled])

  if (isLoading) {
    return (
      <div className="card p-6 text-center text-slate-500">
        Loading portfolio performance...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-center text-slate-500">
        ROI data is temporarily unavailable. Please try again soon.
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card p-6 text-center text-slate-500">
        ROI data is unavailable right now. Please check back soon.
        {data.lastError ? (
          <div className="mt-2 text-xs text-slate-400">{data.lastError}</div>
        ) : null}
        {isAdmin && data.portfolioKey ? (
          <div className="mt-3">
            <Link
              href={`/admin/roi/diagnostics?portfolioKey=${encodeURIComponent(data.portfolioKey)}`}
              className="text-yellow-600 hover:text-yellow-700 font-medium"
            >
              View diagnostics
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  if (data.navSeries.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-500">
        Data updating... Please check back soon.
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
  const asOfDate = data.asOfDate ?? data.kpis?.as_of_date ?? data.lastRebalance?.effective_date ?? null

  return (
    <div className="space-y-8">
      {showStatusBadge ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
            Updating / waiting for latest data
          </span>
          {primaryLabel ? <span className="text-xs text-slate-400">{primaryLabel}</span> : null}
        </div>
      ) : null}
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
            <p className="text-xl font-semibold text-slate-800">{asOfDate ?? '--'}</p>
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
          Last update posted: {data.lastSignalDate ?? data.lastRebalance?.effective_date ?? '--'}
        </span>
        <span>{primaryLabel ?? 'Primary: --'}</span>
        <Link href="/portfolio" className="text-yellow-600 hover:text-yellow-700 font-medium">
          View My Portfolio
        </Link>
      </div>
    </div>
  )
}
