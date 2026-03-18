import {
  UPDATE_TYPE_LABELS,
  UPDATE_TYPE_COLORS,
  ASSET_COLORS,
} from '@/lib/strategies/constants'
import { ArrowRight } from 'lucide-react'

interface StrategyUpdate {
  date: string
  updateType: string
  fromState?: string | null
  toState?: string | null
  commentaryText?: string | null
}

interface StrategyUpdateItemProps {
  update: StrategyUpdate
}

export function StrategyUpdateItem({ update }: StrategyUpdateItemProps) {
  const { date, updateType, fromState, toState, commentaryText } = update
  const typeColor = UPDATE_TYPE_COLORS[updateType] ?? '#8a7d6b'
  const typeLabel = UPDATE_TYPE_LABELS[updateType] ?? updateType

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex gap-4 py-3">
      {/* Date column */}
      <div className="shrink-0 w-20">
        <p className="text-xs text-[#8a7d6b] tabular-nums">{formattedDate}</p>
      </div>

      {/* Type badge */}
      <div className="shrink-0">
        <span
          className="inline-block text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full"
          style={{
            color: typeColor,
            backgroundColor: `${typeColor}18`,
            border: `1px solid ${typeColor}30`,
          }}
        >
          {typeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {updateType === 'rotation' && fromState && toState && (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: ASSET_COLORS[fromState] ?? '#8a7d6b' }}
              />
              <span className="text-[#f5f0e8]">{fromState}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#8a7d6b]" />
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: ASSET_COLORS[toState] ?? '#8a7d6b' }}
              />
              <span className="text-[#f5f0e8] font-medium">{toState}</span>
            </span>
          </div>
        )}

        {updateType === 'sdca_buy' && (
          <div className="text-sm">
            {toState && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: ASSET_COLORS[toState] ?? '#8a7d6b' }}
                />
                <span className="text-[#f5f0e8]">Buy {toState}</span>
              </span>
            )}
            {commentaryText && (
              <p className="text-xs text-[#8a7d6b] mt-1">{commentaryText}</p>
            )}
          </div>
        )}

        {updateType === 'commentary' && commentaryText && (
          <p className="text-sm text-[#f5f0e8] leading-relaxed">
            {commentaryText}
          </p>
        )}

        {updateType === 'rebalance' && (
          <div className="text-sm">
            <span className="text-[#f5f0e8]">Portfolio rebalanced</span>
            {commentaryText && (
              <p className="text-xs text-[#8a7d6b] mt-1">{commentaryText}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
