'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercentage } from '@/lib/perf/format'
import { Calendar } from 'lucide-react'

interface MonthlyReturn {
  year: number
  month: number
  return: number
}

interface MonthlyHeatmapProps {
  monthlyReturns: MonthlyReturn[]
}

export function MonthlyHeatmap({ monthlyReturns }: MonthlyHeatmapProps) {
  if (monthlyReturns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Returns Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 text-[var(--text-muted)]">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
            <p>No monthly returns data available</p>
            <p className="text-sm">Create some trades to see the heatmap</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group returns by year and month
  const returnsByYear = monthlyReturns.reduce((acc, ret) => {
    if (!acc[ret.year]) {
      acc[ret.year] = {}
    }
    acc[ret.year][ret.month] = ret.return
    return acc
  }, {} as Record<number, Record<number, number>>)

  const years = Object.keys(returnsByYear).map(Number).sort()
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  // Calculate color scale
  const allReturns = monthlyReturns.map(r => r.return)
  const maxReturn = Math.max(...allReturns)
  const minReturn = Math.min(...allReturns)
  const maxAbsReturn = Math.max(Math.abs(maxReturn), Math.abs(minReturn))

  const getColor = (returnValue: number) => {
    if (returnValue === 0) return '#1a1815' // No data
    
    const intensity = Math.abs(returnValue) / maxAbsReturn
    const opacity = Math.max(0.3, intensity)
    
    if (returnValue > 0) {
      return `rgba(16, 185, 129, ${opacity})` // Green for positive
    } else {
      return `rgba(239, 68, 68, ${opacity})` // Red for negative
    }
  }

  const getTextColor = (returnValue: number) => {
    if (returnValue === 0) return '#8a7d6b'
    return Math.abs(returnValue) > maxAbsReturn * 0.5 ? 'white' : '#f5f0e8'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Monthly Returns Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)]">Best Month</p>
              <p className="text-lg font-semibold text-[#4a7c3f]">
                {formatPercentage(maxReturn)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)]">Worst Month</p>
              <p className="text-lg font-semibold text-[#c03030]">
                {formatPercentage(minReturn)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)]">Avg Monthly</p>
              <p className="text-lg font-semibold text-[var(--text-strong)]">
                {formatPercentage(allReturns.reduce((sum, r) => sum + r, 0) / allReturns.length)}
              </p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Month headers */}
              <div className="flex mb-2">
                <div className="w-16"></div> {/* Year column spacer */}
                {months.map(month => (
                  <div key={month} className="w-12 text-center text-xs font-medium text-[var(--text-muted)]">
                    {month}
                  </div>
                ))}
              </div>

              {/* Heatmap rows */}
              {years.map(year => (
                <div key={year} className="flex mb-1">
                  <div className="w-16 text-sm font-medium text-[var(--text-strong)] flex items-center">
                    {year}
                  </div>
                  {months.map((_, monthIndex) => {
                    const month = monthIndex + 1
                    const returnValue = returnsByYear[year]?.[month] ?? 0
                    const hasData = returnValue !== 0
                    
                    return (
                      <div
                        key={`${year}-${month}`}
                        className="w-12 h-8 flex items-center justify-center text-xs font-medium border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
                        style={{
                          backgroundColor: getColor(returnValue),
                          color: getTextColor(returnValue)
                        }}
                        title={`${year} ${months[monthIndex]}: ${hasData ? formatPercentage(returnValue) : 'No data'}`}
                      >
                        {hasData ? formatPercentage(returnValue, 0) : '—'}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Color scale legend */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-[var(--text-muted)]">Returns:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-[var(--text-muted)]">Negative</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#1a1815] rounded"></div>
              <span className="text-[var(--text-muted)]">No Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-[var(--text-muted)]">Positive</span>
            </div>
          </div>

          {/* Scale indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Scale:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span>{formatPercentage(-maxAbsReturn)}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-[#1a1815] rounded"></div>
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span>{formatPercentage(maxAbsReturn)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
