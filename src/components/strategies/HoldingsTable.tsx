import { ASSET_COLORS } from '@/lib/strategies/constants'

interface Holding {
  asset: string
  allocationPct: number
  price: number
}

interface HoldingsTableProps {
  holdingsJson: Holding[]
}

export function HoldingsTable({ holdingsJson }: HoldingsTableProps) {
  if (!holdingsJson || holdingsJson.length === 0) {
    return (
      <div className="text-center py-8 text-[#8a7d6b]">
        <p>No current holdings</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2520]">
            <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-[#8a7d6b] font-medium">
              Asset
            </th>
            <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-[#8a7d6b] font-medium">
              Allocation
            </th>
            <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-[#8a7d6b] font-medium">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {holdingsJson.map((holding) => {
            const color = ASSET_COLORS[holding.asset] ?? '#8a7d6b'
            return (
              <tr
                key={holding.asset}
                className="border-b border-[#2a2520] last:border-b-0"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-[#f5f0e8]">
                      {holding.asset}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[#2a2520] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(holding.allocationPct, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-[#f5f0e8] tabular-nums w-12 text-right">
                      {holding.allocationPct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-[#f5f0e8] tabular-nums">
                  ${holding.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
