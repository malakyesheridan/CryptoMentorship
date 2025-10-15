'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  EquityCurveChart, 
  PerformanceMetricsChart, 
  DrawdownChart
} from '@/components/charts'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

interface PerformanceData {
  stats: any
  equitySeries: Array<{ date: string; equity: number; drawdown: number }>
  drawdownSeries: Array<{ date: string; equity: number; drawdown: number }>
  monthlyReturns: Array<{ month: string; return: number; trades: number }>
  tradeStats: {
    totalTrades: number
    closedTrades: number
    openTrades: number
    avgHoldDays: number
  }
}

interface EnhancedPerformanceChartsProps {
  data: PerformanceData
  scope: string
  onRefresh?: () => void
}

export function EnhancedPerformanceCharts({ 
  data, 
  scope, 
  onRefresh 
}: EnhancedPerformanceChartsProps) {
  const [showEnhancedCharts, setShowEnhancedCharts] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Transform data for our new charts
  const equityData = data.equitySeries.map(point => ({
    date: point.date,
    equity: point.equity,
    drawdown: point.drawdown
  }))

  const drawdownData = data.drawdownSeries.map(point => ({
    date: point.date,
    drawdown: point.drawdown,
    equity: point.equity
  }))

  const monthlyData = data.monthlyReturns.map(point => ({
    month: point.month,
    return: point.return,
    trades: point.trades
  }))

  return (
    <div className="space-y-8">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnhancedCharts(!showEnhancedCharts)}
            className="flex items-center gap-2"
          >
            {showEnhancedCharts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showEnhancedCharts ? 'Hide Enhanced Charts' : 'Show Enhanced Charts'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Time Range:</span>
          <span className="px-2 py-1 bg-slate-100 rounded text-sm font-medium">{scope}</span>
        </div>
      </div>

      {showEnhancedCharts && (
        <>
          {/* Enhanced Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Equity Curve */}
            <EquityCurveChart
              data={equityData}
              title="Portfolio Equity Curve"
              description={`${scope} performance overview`}
              height={400}
            />

            {/* Drawdown Analysis */}
            <DrawdownChart
              data={drawdownData}
              title="Drawdown Analysis"
              description="Portfolio drawdown over time"
              height={400}
            />
          </div>

          {/* Monthly Returns */}
          <PerformanceMetricsChart
            data={monthlyData}
            title="Monthly Returns"
            description="Monthly performance breakdown"
            height={400}
          />

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Return</p>
                    <p className={`text-2xl font-bold ${
                      data.stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.stats.totalReturn >= 0 ? '+' : ''}{data.stats.totalReturn?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Max Drawdown</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{data.stats.maxDrawdown?.toFixed(2) || 0}%
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {data.stats.winRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Trades</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {data.tradeStats.totalTrades || 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
