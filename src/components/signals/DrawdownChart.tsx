'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercentage, formatDate } from '@/lib/perf/format'
import { TrendingDown } from 'lucide-react'

interface EquityPoint {
  date: Date
  equity: number
  drawdown: number
  trades: number
}

interface DrawdownChartProps {
  equityPoints: EquityPoint[]
}

export function DrawdownChart({ equityPoints }: DrawdownChartProps) {
  if (equityPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Drawdown Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-500">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No drawdown data available</p>
            <p className="text-sm">Create some trades to see the drawdown curve</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate chart dimensions and scaling
  const maxDrawdown = Math.max(...equityPoints.map(p => p.drawdown))
  const minDrawdown = Math.min(...equityPoints.map(p => p.drawdown))
  const drawdownRange = maxDrawdown - minDrawdown
  const padding = drawdownRange * 0.1 // 10% padding

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

  const scaleY = (drawdown: number) => {
    const scaledMin = minDrawdown - padding
    const scaledMax = maxDrawdown + padding
    const scaledRange = scaledMax - scaledMin
    return margin.top + ((scaledMax - drawdown) / scaledRange) * (chartHeight - margin.top - margin.bottom)
  }

  // Generate path for drawdown curve
  const drawdownPath = equityPoints
    .map((point, index) => {
      const x = scaleX(point.date)
      const y = scaleY(point.drawdown)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Fill area under curve
  const fillPath = `${drawdownPath} L ${scaleX(equityPoints[equityPoints.length - 1].date)} ${chartHeight - margin.bottom} L ${scaleX(equityPoints[0].date)} ${chartHeight - margin.bottom} Z`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Drawdown Curve
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Max Drawdown</p>
              <p className="text-lg font-semibold text-red-600">
                {formatPercentage(maxDrawdown)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Current Drawdown</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatPercentage(equityPoints[equityPoints.length - 1].drawdown)}
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
                const value = maxDrawdown - (ratio * drawdownRange)
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
                      {formatPercentage(value, 1)}
                    </text>
                  </g>
                )
              })}

              {/* Fill area under curve */}
              <path
                d={fillPath}
                fill="#fecaca"
                fillOpacity={0.3}
              />

              {/* Drawdown curve */}
              <path
                d={drawdownPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                className="drop-shadow-sm"
              />

              {/* Data points */}
              {equityPoints.map((point, index) => {
                const x = scaleX(point.date)
                const y = scaleY(point.drawdown)
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={3}
                    fill="#ef4444"
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
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Drawdown</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Data Points</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
