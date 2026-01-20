'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { PerformancePoint } from '@/lib/roi-dashboard'

const RANGE_OPTIONS = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 180 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: 'ALL', label: 'ALL', days: null }
]

function parseDate(value: string): Date {
  if (!value) return new Date('Invalid Date')
  if (value.length <= 10) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

export function RoiEquityChart({
  modelSeries,
  btcSeries,
  ethSeries,
  showBtcDefault,
  showEthDefault,
  primaryByDate,
  primaryPriceByDate
}: {
  modelSeries: PerformancePoint[]
  btcSeries: PerformancePoint[]
  ethSeries: PerformancePoint[]
  showBtcDefault: boolean
  showEthDefault: boolean
  primaryByDate?: Record<string, string>
  primaryPriceByDate?: Record<string, number>
}) {
  const [range, setRange] = useState('1Y')
  const allowBtc = showBtcDefault && btcSeries.length > 0
  const allowEth = showEthDefault && ethSeries.length > 0
  const [showBtc, setShowBtc] = useState(allowBtc)
  const [showEth, setShowEth] = useState(allowEth)

  const mergedSeries = useMemo(() => {
    const map = new Map<string, { date: string; model?: number; btc?: number; eth?: number }>()
    const addSeries = (points: PerformancePoint[], key: 'model' | 'btc' | 'eth') => {
      for (const point of points) {
        const existing = map.get(point.date) ?? { date: point.date }
        existing[key] = point.value
        map.set(point.date, existing)
      }
    }
    addSeries(modelSeries, 'model')
    addSeries(btcSeries, 'btc')
    addSeries(ethSeries, 'eth')
    return Array.from(map.values()).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
  }, [modelSeries, btcSeries, ethSeries])

  const enrichedSeries = useMemo(() => {
    if (mergedSeries.length === 0) return []
    let prevModel: number | null = null
    return mergedSeries.map((point) => {
      const model = typeof point.model === 'number' ? point.model : null
      const modelReturn = model !== null && prevModel !== null && prevModel !== 0
        ? ((model / prevModel) - 1) * 100
        : null
      if (model !== null) {
        prevModel = model
      }
      return { ...point, modelReturn }
    })
  }, [mergedSeries])

  const filteredSeries = useMemo(() => {
    if (enrichedSeries.length === 0) return []
    const option = RANGE_OPTIONS.find((item) => item.id === range)
    if (!option || option.days === null) return enrichedSeries
    const lastDate = parseDate(enrichedSeries[enrichedSeries.length - 1].date)
    const startDate = new Date(lastDate.getTime() - option.days * 24 * 60 * 60 * 1000)
    return enrichedSeries.filter((point) => parseDate(point.date).getTime() >= startDate.getTime())
  }, [enrichedSeries, range])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)

  const formatCurrencySigned = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '--'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${formatCurrency(Math.abs(value))}`
  }

  const formatPercent = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '--'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const formatPrice = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '--'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value)
  }

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props ?? {}
    if (!active || !payload || payload.length === 0 || !label) return null
    const primary = primaryByDate?.[label as string] ?? null
    const labelDate = parseDate(label as string)
    const dateKey = Number.isNaN(labelDate.getTime()) ? null : labelDate.toISOString().slice(0, 10)
    const prevDate = dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : null
    if (prevDate) prevDate.setUTCDate(prevDate.getUTCDate() - 1)
    const prevDateKey = prevDate ? prevDate.toISOString().slice(0, 10) : null
    const primaryPrice = dateKey ? (primaryPriceByDate?.[dateKey] ?? null) : null
    const primaryPrevPrice = prevDateKey ? (primaryPriceByDate?.[prevDateKey] ?? null) : null
    const primaryDelta = primaryPrice !== null && primaryPrevPrice !== null
      ? primaryPrice - primaryPrevPrice
      : null
    const primaryDeltaPct = primaryPrice !== null && primaryPrevPrice !== null && primaryPrevPrice !== 0
      ? ((primaryPrice / primaryPrevPrice) - 1) * 100
      : null
    const modelReturn = typeof payload?.[0]?.payload?.modelReturn === 'number'
      ? payload[0].payload.modelReturn
      : null
    const entries = payload as Array<{
      dataKey?: string
      name?: string
      value?: number
      color?: string
    }>
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
        <div className="text-xs font-semibold text-slate-700">
          {format(parseDate(label as string), 'dd-MM-yyyy')}
        </div>
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          {entries.map((entry) => (
            <div key={`${entry.dataKey ?? entry.name ?? 'series'}`} className="flex items-center justify-between gap-4">
              <span className="uppercase" style={{ color: entry.color }}>
                {entry.name ?? entry.dataKey}
              </span>
              <span className="text-slate-700">
                {formatCurrency(Number(entry.value ?? 0))}
              </span>
            </div>
          ))}
          {modelReturn !== null ? (
            <div className="flex items-center justify-between gap-4 text-slate-500">
              <span>Daily return</span>
              <span className={modelReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatPercent(modelReturn)}
              </span>
            </div>
          ) : null}
          {primary ? (
            <div className="pt-1 text-slate-500">Primary: {primary}</div>
          ) : null}
          {primaryPrice !== null ? (
            <div className="text-slate-500">Primary close: {formatPrice(primaryPrice)}</div>
          ) : null}
          {primaryDelta !== null ? (
            <div className="flex items-center justify-between gap-4 text-slate-500">
              <span>Primary change</span>
              <span className={primaryDelta >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrencySigned(primaryDelta)} ({formatPercent(primaryDeltaPct)})
              </span>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Card className="card">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Equity Curve</CardTitle>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={range === option.id ? 'default' : 'outline'}
                onClick={() => setRange(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          {allowBtc && (
            <label className="flex items-center gap-2">
              <Switch checked={showBtc} onChange={(event) => setShowBtc(event.target.checked)} />
              BTC
            </label>
          )}
          {allowEth && (
            <label className="flex items-center gap-2">
              <Switch checked={showEth} onChange={(event) => setShowEth(event.target.checked)} />
              ETH
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseDate(value), 'MMM d')}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip content={renderTooltip} />
              <Line type="monotone" dataKey="model" stroke="#10b981" strokeWidth={2} dot={false} name="Model" />
              {allowBtc && showBtc && (
                <Line type="monotone" dataKey="btc" stroke="#f59e0b" strokeWidth={2} dot={false} name="BTC" />
              )}
              {allowEth && showEth && (
                <Line type="monotone" dataKey="eth" stroke="#3b82f6" strokeWidth={2} dot={false} name="ETH" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
