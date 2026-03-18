'use client'

import { ReactionType } from '@prisma/client'
import { REACTION_EMOJI } from '@/lib/community/constants'

interface ReactionBarProps {
  userReactions: ReactionType[]
  reactionCount: number
  reactionCounts?: Partial<Record<ReactionType, number>>
  onReact: (type: ReactionType) => void
}

export function ReactionBar({ userReactions, reactionCounts, onReact }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
        const isActive = userReactions.includes(type)
        const count = reactionCounts?.[type] || 0
        return (
          <button
            key={type}
            onClick={() => onReact(type)}
            className={`flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg transition-all ${
              isActive
                ? 'bg-[var(--gold-400)]/15 text-[var(--gold-400)] ring-1 ring-[var(--gold-400)]/30'
                : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
            }`}
            title={type.charAt(0) + type.slice(1).toLowerCase()}
          >
            <span className="text-base">{REACTION_EMOJI[type]}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
