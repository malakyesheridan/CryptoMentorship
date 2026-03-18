'use client'

import Link from 'next/link'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { ASSET_COLORS, STRATEGY_TYPE_LABELS } from '@/lib/strategies/constants'

interface EquityCurvePoint {
  date: string
  equityValue: number
}

interface StrategySnapshot {
  performanceJson: {
    netReturn: number
    sharpe: number
    maxDd: number
  }
  dominantAsset: string
  equityValue: number
}

interface Strategy {
  name: string
  slug: string
  type: string
  latestSnapshot: StrategySnapshot | null
  equityCurve: EquityCurvePoint[]
}

interface StrategyCardProps {
  strategy: Strategy
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const { name, slug, type, latestSnapshot, equityCurve } = strategy

  const netReturn = latestSnapshot?.performanceJson?.netReturn ?? 0
  const sharpe = latestSnapshot?.performanceJson?.sharpe ?? 0
  const maxDd = latestSnapshot?.performanceJson?.maxDd ?? 0
  const dominantAsset = latestSnapshot?.dominantAsset ?? 'BTC'
  const equityValue = latestSnapshot?.equityValue ?? 0

  const assetColor = ASSET_COLORS[dominantAsset] ?? '#8a7d6b'
  const returnColor = netReturn >= 0 ? '#4a7c3f' : '#c03030'

  // Use last 30 points for sparkline
  const sparklineData = equityCurve.slice(-30)

  return (
    <Link href={`/strategies/${slug}`} className="block">
      <div className="card p-5 hover:border-[#c9a227]/40 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-[#f5f0e8] truncate mr-2">
            {name}
          </h3>
          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border border-[#2a2520] text-[#8a7d6b]">
            {STRATEGY_TYPE_LABELS[type] ?? type}
          </span>
        </div>

        {/* Dominant asset indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: assetColor }}
          />
          <span className="text-xs text-[#8a7d6b]">{dominantAsset}</span>
          {equityValue > 0 && (
            <span className="ml-auto text-xs text-[#8a7d6b]">
              ${equityValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7d6b] mb-0.5">Return</p>
            <p className="text-sm font-semibold" style={{ color: returnColor }}>
              {netReturn >= 0 ? '+' : ''}{netReturn.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7d6b] mb-0.5">Sharpe</p>
            <p className="text-sm font-semibold text-[#f5f0e8]">
              {sharpe.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7d6b] mb-0.5">Max DD</p>
            <p className="text-sm font-semibold text-[#c03030]">
              {maxDd.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* 30-day sparkline */}
        {sparklineData.length > 1 && (
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`spark-${slug}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={assetColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={assetColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Area
                  type="monotone"
                  dataKey="equityValue"
                  stroke={assetColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${slug})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Link>
  )
}
