'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/perf/format'
import { BarChart3 } from 'lucide-react'

interface RDistributionChartProps {
  rMultiples: number[]
}

export function RDistributionChart({ rMultiples }: RDistributionChartProps) {
  if (rMultiples.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            R-Multiple Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No R-multiple data available</p>
            <p className="text-sm">Close some trades to see the distribution</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate histogram bins
  const minR = Math.min(...rMultiples)
  const maxR = Math.max(...rMultiples)
  const range = maxR - minR
  const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(rMultiples.length))))
  const binWidth = range / binCount

  const bins = Array.from({ length: binCount }, (_, i) => {
    const binStart = minR + i * binWidth
    const binEnd = binStart + binWidth
    const count = rMultiples.filter(r => r >= binStart && (i === binCount - 1 ? r <= binEnd : r < binEnd)).length
    return {
      start: binStart,
      end: binEnd,
      count,
      center: (binStart + binEnd) / 2
    }
  })

  const maxCount = Math.max(...bins.map(bin => bin.count))

  // Chart dimensions
  const chartHeight = 300
  const chartWidth = 600
  const margin = { top: 20, right: 20, bottom: 40, left: 60 }

  // Scale functions
  const scaleX = (value: number) => {
    return margin.left + ((value - minR) / range) * (chartWidth - margin.left - margin.right)
  }

  const scaleY = (count: number) => {
    return margin.top + ((maxCount - count) / maxCount) * (chartHeight - margin.top - margin.bottom)
  }

  const barWidth = (chartWidth - margin.left - margin.right) / binCount

  // Calculate statistics
  const avgR = rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length
  const medianR = [...rMultiples].sort((a, b) => a - b)[Math.floor(rMultiples.length / 2)]
  const positiveTrades = rMultiples.filter(r => r > 0).length
  const winRate = (positiveTrades / rMultiples.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          R-Multiple Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-600">Avg R</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatNumber(avgR, 2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Median R</p>
              <p className="text-lg font-semibold text-slate-800">
                {formatNumber(medianR, 2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Win Rate</p>
              <p className="text-lg font-semibold text-green-600">
                {formatNumber(winRate, 1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Total Trades</p>
              <p className="text-lg font-semibold text-slate-800">
                {rMultiples.length}
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
                const count = Math.round(maxCount * (1 - ratio))
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
                      {count}
                    </text>
                  </g>
                )
              })}

              {/* Bars */}
              {bins.map((bin, index) => {
                const x = scaleX(bin.start)
                const y = scaleY(bin.count)
                const height = chartHeight - margin.bottom - y
                const isPositive = bin.center > 0
                
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth * 0.8}
                      height={height}
                      fill={isPositive ? '#10b981' : '#ef4444'}
                      fillOpacity={0.7}
                      className="hover:fill-opacity-100 transition-all"
                    />
                    {/* Bin label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - margin.bottom + 15}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#64748b"
                    >
                      {formatNumber(bin.center, 1)}
                    </text>
                  </g>
                )
              })}

              {/* Zero line */}
              <line
                x1={scaleX(0)}
                y1={margin.top}
                x2={scaleX(0)}
                y2={chartHeight - margin.bottom}
                stroke="#374151"
                strokeWidth={2}
                strokeDasharray="4 4"
              />

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

              {/* Axis labels */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                R-Multiple
              </text>
              <text
                x={15}
                y={chartHeight / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
                transform={`rotate(-90, 15, ${chartHeight / 2})`}
              >
                Frequency
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Winning Trades</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Losing Trades</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-slate-600 border-dashed"></div>
              <span>Break-even</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
