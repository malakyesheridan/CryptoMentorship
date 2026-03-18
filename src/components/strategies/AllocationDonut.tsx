'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ASSET_COLORS } from '@/lib/strategies/constants'

interface Holding {
  asset: string
  allocationPct: number
  [key: string]: unknown
}

interface AllocationDonutProps {
  holdings: Holding[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: { asset: string; allocationPct: number }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { asset, allocationPct } = payload[0].payload
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg border"
      style={{ backgroundColor: '#141210', borderColor: '#2a2520' }}
    >
      <span className="font-medium text-[#f5f0e8]">{asset}</span>
      <span className="ml-2 tabular-nums text-[#8a7d6b]">
        {allocationPct.toFixed(1)}%
      </span>
    </div>
  )
}

export function AllocationDonut({ holdings }: AllocationDonutProps) {
  if (!holdings || holdings.length === 0) {
    return (
      <div className="text-center py-8 text-[#8a7d6b]">
        <p>No allocation data</p>
      </div>
    )
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={holdings}
            dataKey="allocationPct"
            nameKey="asset"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
          >
            {holdings.map((entry) => (
              <Cell
                key={entry.asset}
                fill={ASSET_COLORS[entry.asset] ?? '#8a7d6b'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-[#8a7d6b]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
