'use client'

import { ReactionType } from '@prisma/client'
import { REACTION_EMOJI } from '@/lib/community/constants'

interface ReactionBarProps {
  userReactions: ReactionType[]
  reactionCount: number
  onReact: (type: ReactionType) => void
}

export function ReactionBar({ userReactions, reactionCount, onReact }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1">
      {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
        const isActive = userReactions.includes(type)
        return (
          <button
            key={type}
            onClick={() => onReact(type)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
              isActive
                ? 'bg-[var(--gold-400)]/20 text-[var(--gold-400)]'
                : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-[var(--text-strong)]'
            }`}
            title={type.charAt(0) + type.slice(1).toLowerCase()}
          >
            {REACTION_EMOJI[type]}
          </button>
        )
      })}
      {reactionCount > 0 && (
        <span className="text-xs text-[var(--text-muted)] ml-1">{reactionCount}</span>
      )}
    </div>
  )
}
