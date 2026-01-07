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
  showEthDefault
}: {
  modelSeries: PerformancePoint[]
  btcSeries: PerformancePoint[]
  ethSeries: PerformancePoint[]
  showBtcDefault: boolean
  showEthDefault: boolean
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

  const filteredSeries = useMemo(() => {
    if (mergedSeries.length === 0) return []
    const option = RANGE_OPTIONS.find((item) => item.id === range)
    if (!option || option.days === null) return mergedSeries
    const lastDate = parseDate(mergedSeries[mergedSeries.length - 1].date)
    const startDate = new Date(lastDate.getTime() - option.days * 24 * 60 * 60 * 1000)
    return mergedSeries.filter((point) => parseDate(point.date).getTime() >= startDate.getTime())
  }, [mergedSeries, range])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)

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
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name.toUpperCase()]}
                labelFormatter={(label) => format(parseDate(label), 'MMM dd, yyyy')}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
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
