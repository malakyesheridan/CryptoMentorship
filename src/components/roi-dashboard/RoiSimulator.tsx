'use client'

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { PerformancePoint } from '@/lib/roi-dashboard'
import { runSimulation } from '@/lib/roi-dashboard'

function parseDate(value: string): Date {
  if (!value) return new Date('Invalid Date')
  if (value.length <= 10) {
    return new Date(`${value}T00:00:00.000Z`)
  }
  return new Date(value)
}

export function RoiSimulator({
  modelSeries,
  defaultStartDate,
  disclaimerText
}: {
  modelSeries: PerformancePoint[]
  defaultStartDate: string
  disclaimerText: string
}) {
  const [startingCapital, setStartingCapital] = useState(10000)
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [includeContributions, setIncludeContributions] = useState(false)
  const [monthlyContribution, setMonthlyContribution] = useState(500)

  const simulation = useMemo(
    () =>
      runSimulation(modelSeries, {
        startingCapital,
        startDate,
        includeMonthlyContributions: includeContributions,
        monthlyContribution
      }),
    [modelSeries, startingCapital, startDate, includeContributions, monthlyContribution]
  )

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>If You Invested $X</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Starting Capital</label>
            <Input
              type="number"
              min="0"
              value={startingCapital}
              onChange={(event) => setStartingCapital(Number(event.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Switch checked={includeContributions} onChange={(event) => setIncludeContributions(event.target.checked)} />
              Monthly Contributions
            </label>
          </div>
          {includeContributions && (
            <div>
              <label className="text-sm font-medium text-slate-700">Contribution Amount</label>
              <Input
                type="number"
                min="0"
                value={monthlyContribution}
                onChange={(event) => setMonthlyContribution(Number(event.target.value))}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Current Balance</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(simulation.finalBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Profit</p>
            <p className={simulation.profit >= 0 ? 'text-lg font-semibold text-green-600' : 'text-lg font-semibold text-red-600'}>
              {formatCurrency(simulation.profit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">ROI</p>
            <p className={simulation.roiPct >= 0 ? 'text-lg font-semibold text-green-600' : 'text-lg font-semibold text-red-600'}>
              {simulation.roiPct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Worst Drawdown</p>
            <p className="text-lg font-semibold text-red-600">
              {simulation.maxDrawdownPct.toFixed(2)}% ({formatCurrency(simulation.maxDrawdownAmount)})
            </p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => format(parseDate(label), 'MMM dd, yyyy')}
              />
              <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#bbf7d0" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-slate-500">{disclaimerText}</p>
      </CardContent>
    </Card>
  )
}
