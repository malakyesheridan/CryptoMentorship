'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'

interface SignalPoint {
  date: string
  entryPrice: number
  exitPrice?: number
  symbol: string
  direction: 'long' | 'short'
  status: 'open' | 'closed'
  conviction?: number
  pnl?: number
}

interface SignalTimelineChartProps {
  data: SignalPoint[]
  title?: string
  description?: string
  height?: number
}

export function SignalTimelineChart({
  data,
  title = "Signal Timeline",
  description = "Signal entry and exit points over time",
  height = 400
}: SignalTimelineChartProps) {
  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatTooltipDate = (date: string) => {
    return format(new Date(date), 'MMM dd, yyyy')
  }

  const getSignalColor = (signal: SignalPoint) => {
    if (signal.status === 'closed') {
      if (signal.pnl && signal.pnl > 0) return '#10b981' // green for profit
      if (signal.pnl && signal.pnl < 0) return '#ef4444' // red for loss
      return '#64748b' // gray for break-even
    }
    return signal.direction === 'long' ? '#3b82f6' : '#f59e0b' // blue for long, amber for short
  }

  const getSignalSize = (signal: SignalPoint) => {
    const baseSize = 6
    const convictionMultiplier = signal.conviction ? signal.conviction / 5 : 1
    return baseSize * convictionMultiplier
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <div className="font-semibold text-slate-900">{data.symbol}</div>
          <div className="text-sm text-slate-600 mb-2">{formatTooltipDate(data.date)}</div>
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Direction:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                data.direction === 'long' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {data.direction.toUpperCase()}
              </span>
            </div>
            <div className="mb-1">
              <span className="font-medium">Entry:</span> {formatTooltipValue(data.entryPrice)}
            </div>
            {data.exitPrice && (
              <div className="mb-1">
                <span className="font-medium">Exit:</span> {formatTooltipValue(data.exitPrice)}
              </div>
            )}
            {data.pnl !== undefined && (
              <div className="mb-1">
                <span className="font-medium">P&L:</span> 
                <span className={`ml-1 ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.pnl >= 0 ? '+' : ''}{formatTooltipValue(data.pnl)}
                </span>
              </div>
            )}
            {data.conviction && (
              <div>
                <span className="font-medium">Conviction:</span> {data.conviction}/5
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => formatTooltipValue(value)}
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter dataKey="entryPrice">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSignalColor(entry)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span>Profitable Closed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Loss Closed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Open Long</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
            <span>Open Short</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
