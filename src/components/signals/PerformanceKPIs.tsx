'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  formatPercentage, 
  formatNumber, 
  formatMaxDrawdown, 
  formatWinRate, 
  formatProfitFactor,
  formatSharpeRatio,
  formatCalmarRatio,
  formatTradeCount,
  formatDuration,
  getReturnColorClass
} from '@/lib/perf/format'
import { TrendingUp, TrendingDown, Target, Clock, BarChart3, DollarSign } from 'lucide-react'

interface PerformanceStats {
  totalReturn: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  avgRMultiple: number
  expectancy: number
  totalTrades: number
  avgHoldDays: number
  sharpeRatio?: number
  calmarRatio?: number
}

interface PerformanceKPIsProps {
  stats: PerformanceStats
  timeRange: string
}

export function PerformanceKPIs({ stats, timeRange }: PerformanceKPIsProps) {
  const kpis = [
    {
      title: 'Total Return',
      value: formatPercentage(stats.totalReturn),
      icon: TrendingUp,
      color: getReturnColorClass(stats.totalReturn),
      description: `${timeRange} performance`
    },
    {
      title: 'Max Drawdown',
      value: formatMaxDrawdown(stats.maxDrawdown),
      icon: TrendingDown,
      color: 'text-red-600',
      description: 'Peak to trough'
    },
    {
      title: 'Win Rate',
      value: formatWinRate(stats.winRate),
      icon: Target,
      color: stats.winRate >= 50 ? 'text-green-600' : 'text-red-600',
      description: 'Winning trades'
    },
    {
      title: 'Profit Factor',
      value: formatProfitFactor(stats.profitFactor),
      icon: BarChart3,
      color: stats.profitFactor >= 1 ? 'text-green-600' : 'text-red-600',
      description: 'Gross profit / loss'
    },
    {
      title: 'Avg R-Multiple',
      value: formatNumber(stats.avgRMultiple, 2),
      icon: DollarSign,
      color: getReturnColorClass(stats.avgRMultiple * 100),
      description: 'Risk-adjusted return'
    },
    {
      title: 'Total Trades',
      value: formatTradeCount(stats.totalTrades),
      icon: BarChart3,
      color: 'text-slate-600',
      description: `Avg hold: ${formatDuration(stats.avgHoldDays)}`
    }
  ]

  const advancedKpis = [
    {
      title: 'Sharpe Ratio',
      value: formatSharpeRatio(stats.sharpeRatio || 0),
      description: 'Risk-adjusted returns'
    },
    {
      title: 'Calmar Ratio',
      value: formatCalmarRatio(stats.calmarRatio || 0),
      description: 'Return / Max drawdown'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {kpi.title}
                  </p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>
                    {kpi.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {kpi.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <kpi.icon className="h-8 w-8 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced KPIs */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Advanced Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advancedKpis.map((kpi, index) => (
              <div key={index} className="text-center">
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {kpi.title}
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {kpi.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Performance Summary</h3>
            <Badge variant="outline" className="capitalize">
              {timeRange}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Return</span>
              <span className={`font-medium ${getReturnColorClass(stats.totalReturn)}`}>
                {formatPercentage(stats.totalReturn)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Max Drawdown</span>
              <span className="font-medium text-red-600">
                {formatMaxDrawdown(stats.maxDrawdown)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Win Rate</span>
              <span className={`font-medium ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {formatWinRate(stats.winRate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Profit Factor</span>
              <span className={`font-medium ${stats.profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {formatProfitFactor(stats.profitFactor)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Avg R-Multiple</span>
              <span className={`font-medium ${getReturnColorClass(stats.avgRMultiple * 100)}`}>
                {formatNumber(stats.avgRMultiple, 2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Trades</span>
              <span className="font-medium text-slate-800">
                {formatTradeCount(stats.totalTrades)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Avg Hold Time</span>
              <span className="font-medium text-slate-800">
                {formatDuration(stats.avgHoldDays)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
