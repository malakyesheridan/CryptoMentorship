'use client'

import { useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartExport } from './ChartExport'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface EquityPoint {
  date: string
  equity: number
  drawdown?: number
}

interface EquityCurveChartProps {
  data: EquityPoint[]
  title?: string
  description?: string
  height?: number
  showReferenceLine?: boolean
  referenceValue?: number
}

export function EquityCurveChart({
  data,
  title = "Portfolio Equity Curve",
  description = "Portfolio value over time",
  height = 400,
  showReferenceLine = true,
  referenceValue = 10000
}: EquityCurveChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  // Calculate performance metrics
  const firstValue = data[0]?.equity || 0
  const lastValue = data[data.length - 1]?.equity || 0
  const totalReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  const maxValue = Math.max(...data.map(d => d.equity))
  const minValue = Math.min(...data.map(d => d.equity))
  const maxDrawdown = firstValue > 0 ? ((maxValue - minValue) / maxValue) * 100 : 0

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatTooltipDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#4a7c3f]" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <div className={`font-semibold ${totalReturn >= 0 ? 'text-[#4a7c3f]' : 'text-[#c03030]'}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </div>
                <div className="text-[var(--text-muted)]">Total Return</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[#c03030]">
                  -{maxDrawdown.toFixed(2)}%
                </div>
                <div className="text-[var(--text-muted)]">Max Drawdown</div>
              </div>
            </div>
            <ChartExport chartRef={chartRef} filename={`equity-curve-${Date.now()}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#8a7d6b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#8a7d6b"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltipValue(value), 'Equity']}
              labelFormatter={(label) => formatTooltipDate(label)}
              contentStyle={{
                backgroundColor: '#141210',
                border: '1px solid #2a2520',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            {showReferenceLine && (
              <ReferenceLine 
                y={referenceValue} 
                stroke="#8a7d6b" 
                strokeDasharray="2 2" 
                label={{ value: "Starting Value", position: "top" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
