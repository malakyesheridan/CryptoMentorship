'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/perf/format'
import { TrendingUp } from 'lucide-react'

interface EquityPoint {
  date: Date
  equity: number
  drawdown: number
  trades: number
}

interface EquityChartProps {
  equityPoints: EquityPoint[]
  baseCapital: number
}

export function EquityChart({ equityPoints, baseCapital }: EquityChartProps) {
  if (equityPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No equity data available</p>
            <p className="text-sm">Create some trades to see the equity curve</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate chart dimensions and scaling
  const maxEquity = Math.max(...equityPoints.map(p => p.equity))
  const minEquity = Math.min(...equityPoints.map(p => p.equity))
  const equityRange = maxEquity - minEquity
  const padding = equityRange * 0.1 // 10% padding

  const chartHeight = 300
  const chartWidth = 800
  const margin = { top: 20, right: 20, bottom: 40, left: 60 }

  // Scale functions
  const scaleX = (date: Date) => {
    const startTime = equityPoints[0].date.getTime()
    const endTime = equityPoints[equityPoints.length - 1].date.getTime()
    const timeRange = endTime - startTime
    return margin.left + ((date.getTime() - startTime) / timeRange) * (chartWidth - margin.left - margin.right)
  }

  const scaleY = (equity: number) => {
    const scaledMin = minEquity - padding
    const scaledMax = maxEquity + padding
    const scaledRange = scaledMax - scaledMin
    return margin.top + ((scaledMax - equity) / scaledRange) * (chartHeight - margin.top - margin.bottom)
  }

  // Generate path for equity curve
  const equityPath = equityPoints
    .map((point, index) => {
      const x = scaleX(point.date)
      const y = scaleY(point.equity)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Calculate total return
  const totalReturn = ((equityPoints[equityPoints.length - 1].equity - baseCapital) / baseCapital) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Equity Curve
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Starting Capital</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatCurrency(baseCapital)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Current Equity</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatCurrency(equityPoints[equityPoints.length - 1].equity)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Total Return</p>
              <p className={`text-lg font-semibold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="overflow-x-auto">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="border border-slate-200 rounded-lg"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y = margin.top + ratio * (chartHeight - margin.top - margin.bottom)
                const value = maxEquity - (ratio * equityRange)
                return (
                  <g key={ratio}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={chartWidth - margin.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                    <text
                      x={margin.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#64748b"
                    >
                      {formatCurrency(value, 0)}
                    </text>
                  </g>
                )
              })}

              {/* Equity curve */}
              <path
                d={equityPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                className="drop-shadow-sm"
              />

              {/* Data points */}
              {equityPoints.map((point, index) => {
                const x = scaleX(point.date)
                const y = scaleY(point.equity)
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={3}
                    fill="#3b82f6"
                    className="hover:r-4 transition-all"
                  />
                )
              })}

              {/* Axes */}
              <line
                x1={margin.left}
                y1={chartHeight - margin.bottom}
                x2={chartWidth - margin.right}
                y2={chartHeight - margin.bottom}
                stroke="#374151"
                strokeWidth={2}
              />
              <line
                x1={margin.left}
                y1={margin.top}
                x2={margin.left}
                y2={chartHeight - margin.bottom}
                stroke="#374151"
                strokeWidth={2}
              />

              {/* X-axis labels */}
              {equityPoints.filter((_, index) => index % Math.ceil(equityPoints.length / 6) === 0).map((point, index) => {
                const x = scaleX(point.date)
                return (
                  <text
                    key={index}
                    x={x}
                    y={chartHeight - margin.bottom + 20}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#64748b"
                  >
                    {formatDate(point.date, 'short')}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>Equity Curve</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Data Points</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
