import { ASSET_COLORS } from '@/lib/strategies/constants'
import { getAssetDisplayLabel } from '@/lib/portfolio-assets'

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
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p>No current holdings</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Asset
            </th>
            <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Allocation
            </th>
            <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {holdingsJson.map((holding) => {
            const color = ASSET_COLORS[holding.asset] ?? 'var(--text-muted)'
            return (
              <tr
                key={holding.asset}
                className="border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-[var(--text-strong)]">
                      {getAssetDisplayLabel(holding.asset)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-[var(--bg-skeleton)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(holding.allocationPct, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-[var(--text-strong)] tabular-nums w-12 text-right">
                      {holding.allocationPct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-[var(--text-strong)] tabular-nums">
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
