'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface MonthlyReturn {
  month: string
  return: number
  trades: number
}

interface PerformanceMetricsChartProps {
  data: MonthlyReturn[]
  title?: string
  description?: string
  height?: number
}

export function PerformanceMetricsChart({
  data,
  title = "Monthly Returns",
  description = "Monthly performance breakdown",
  height = 400
}: PerformanceMetricsChartProps) {
  const formatTooltipValue = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatTooltipDate = (month: string) => {
    return format(new Date(month), 'MMMM yyyy')
  }

  const getBarColor = (value: number) => {
    if (value > 0) return '#10b981' // green
    if (value < 0) return '#ef4444' // red
    return '#64748b' // gray
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              tickFormatter={(value) => format(new Date(value), 'MMM')}
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltipValue(value), 'Return']}
              labelFormatter={(label) => formatTooltipDate(label)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar 
              dataKey="return" 
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
