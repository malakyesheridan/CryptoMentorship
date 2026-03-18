'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ASSET_COLORS } from '@/lib/strategies/constants'

interface EquityCurvePoint {
  date: string
  equityValue: number
  dominantAsset: string
  dailyReturn: number
}

interface StrategyEquityCurveProps {
  equityCurve: EquityCurvePoint[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: EquityCurvePoint
  }>
  label?: string
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const assetColor = ASSET_COLORS[point.dominantAsset] ?? '#8a7d6b'
  const returnColor = point.dailyReturn >= 0 ? '#4a7c3f' : '#c03030'

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg border"
      style={{ backgroundColor: '#141210', borderColor: '#2a2520' }}
    >
      <p className="text-[#8a7d6b] mb-1">{point.date}</p>
      <p className="text-[#f5f0e8] font-medium">
        ${point.equityValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: assetColor }}
        />
        <span className="text-[#8a7d6b]">{point.dominantAsset}</span>
        <span className="ml-auto tabular-nums" style={{ color: returnColor }}>
          {point.dailyReturn >= 0 ? '+' : ''}
          {point.dailyReturn.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

/**
 * Build segmented area definitions so each dominant-asset run gets its own
 * colour. Recharts doesn't natively support per-point colours on a single
 * <Area>, so we use an SVG <linearGradient> with hard stops that map each
 * index range to the correct ASSET_COLORS entry.
 */
function buildGradientStops(data: EquityCurvePoint[]) {
  if (data.length === 0) return []

  const stops: Array<{ offset: string; color: string }> = []
  let prevAsset = data[0].dominantAsset

  for (let i = 0; i < data.length; i++) {
    const asset = data[i].dominantAsset
    if (asset !== prevAsset) {
      const pct = ((i - 1) / (data.length - 1)) * 100
      const pctNext = (i / (data.length - 1)) * 100
      stops.push({ offset: `${pct}%`, color: ASSET_COLORS[prevAsset] ?? '#8a7d6b' })
      stops.push({ offset: `${pctNext}%`, color: ASSET_COLORS[asset] ?? '#8a7d6b' })
      prevAsset = asset
    }
  }
  // Final segment
  stops.push({ offset: '100%', color: ASSET_COLORS[prevAsset] ?? '#8a7d6b' })
  if (stops.length === 1) {
    stops.unshift({ offset: '0%', color: stops[0].color })
  }

  return stops
}

export function StrategyEquityCurve({ equityCurve }: StrategyEquityCurveProps) {
  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="text-center py-12 text-[#8a7d6b]">
        <p>No equity curve data available</p>
      </div>
    )
  }

  const strokeStops = buildGradientStops(equityCurve)
  const fillStops = strokeStops.map((s) => ({
    ...s,
    color: s.color,
  }))

  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={equityCurve} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="equityStroke" x1="0" y1="0" x2="1" y2="0">
              {strokeStops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              {fillStops.length > 0 && (
                <>
                  <stop offset="0%" stopColor={fillStops[0].color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={fillStops[0].color} stopOpacity={0} />
                </>
              )}
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2520"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tick={{ fill: '#8a7d6b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2a2520' }}
            minTickGap={40}
          />
          <YAxis
            tick={{ fill: '#8a7d6b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
            }
            width={56}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="equityValue"
            stroke="url(#equityStroke)"
            strokeWidth={2}
            fill="url(#equityFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
