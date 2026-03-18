'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown } from 'lucide-react'

interface DrawdownPoint {
  date: string
  drawdown: number
  equity: number
}

interface DrawdownChartProps {
  data: DrawdownPoint[]
  title?: string
  description?: string
  height?: number
}

export function DrawdownChart({
  data,
  title = "Drawdown Analysis",
  description = "Portfolio drawdown over time",
  height = 400
}: DrawdownChartProps) {
  const maxDrawdown = Math.min(...data.map(d => d.drawdown))
  const avgDrawdown = data.reduce((sum, d) => sum + d.drawdown, 0) / data.length

  const formatTooltipValue = (value: number) => {
    return `${value.toFixed(2)}%`
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
              <TrendingDown className="h-5 w-5 text-[#c03030]" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <div className="font-semibold text-[#c03030]">
                {maxDrawdown.toFixed(2)}%
              </div>
              <div className="text-[var(--text-muted)]">Max Drawdown</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-[var(--text-muted)]">
                {avgDrawdown.toFixed(2)}%
              </div>
              <div className="text-[var(--text-muted)]">Avg Drawdown</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#8a7d6b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              stroke="#8a7d6b"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltipValue(value), 'Drawdown']}
              labelFormatter={(label) => formatTooltipDate(label)}
              contentStyle={{
                backgroundColor: '#141210',
                border: '1px solid #2a2520',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <ReferenceLine y={0} stroke="#8a7d6b" strokeDasharray="2 2" />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
