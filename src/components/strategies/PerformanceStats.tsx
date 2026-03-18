import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
  Gauge,
  Percent,
} from 'lucide-react'

interface PerformanceJson {
  netReturn: number
  sharpe: number
  sortino: number
  maxDd: number
  calmar: number
  omega: number
  winRate: number
}

interface PerformanceStatsProps {
  performanceJson: PerformanceJson
}

export function PerformanceStats({ performanceJson }: PerformanceStatsProps) {
  const {
    netReturn = 0,
    sharpe = 0,
    sortino = 0,
    maxDd = 0,
    calmar = 0,
    omega = 0,
    winRate = 0,
  } = performanceJson ?? {}

  const returnColor = netReturn >= 0 ? '#4a7c3f' : '#c03030'

  const stats = [
    {
      title: 'Total Return',
      value: `${netReturn >= 0 ? '+' : ''}${netReturn.toFixed(2)}%`,
      color: returnColor,
      icon: TrendingUp,
      description: 'Net portfolio return',
    },
    {
      title: 'Max Drawdown',
      value: `${maxDd.toFixed(2)}%`,
      color: '#c03030',
      icon: TrendingDown,
      description: 'Peak to trough',
    },
    {
      title: 'Sharpe Ratio',
      value: sharpe.toFixed(2),
      color: sharpe >= 1 ? '#4a7c3f' : '#f5f0e8',
      icon: BarChart3,
      description: 'Risk-adjusted returns',
    },
    {
      title: 'Sortino Ratio',
      value: sortino.toFixed(2),
      color: sortino >= 1 ? '#4a7c3f' : '#f5f0e8',
      icon: Shield,
      description: 'Downside risk-adjusted',
    },
    {
      title: 'Calmar Ratio',
      value: calmar.toFixed(2),
      color: calmar >= 1 ? '#4a7c3f' : '#f5f0e8',
      icon: Gauge,
      description: 'Return / Max drawdown',
    },
    {
      title: 'Omega Ratio',
      value: omega.toFixed(2),
      color: omega >= 1 ? '#4a7c3f' : '#f5f0e8',
      icon: Target,
      description: 'Gains vs losses ratio',
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? '#4a7c3f' : '#c03030',
      icon: Percent,
      description: 'Profitable periods',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-lg border border-[#2a2520] p-4"
          style={{ backgroundColor: '#1a1815' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7d6b] font-medium">
              {stat.title}
            </p>
            <stat.icon className="h-4 w-4 text-[#8a7d6b]" />
          </div>
          <p className="text-xl font-bold tabular-nums" style={{ color: stat.color }}>
            {stat.value}
          </p>
          <p className="text-xs text-[#8a7d6b] mt-1">{stat.description}</p>
        </div>
      ))}
    </div>
  )
}
