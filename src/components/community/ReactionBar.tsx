'use client'

import { ReactionType } from '@prisma/client'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface ReactionBarProps {
  userReactions: ReactionType[]
  reactionCount: number
  reactionCounts?: Partial<Record<ReactionType, number>>
  onReact: (type: ReactionType) => void
}

export function ReactionBar({ userReactions, reactionCounts, onReact }: ReactionBarProps) {
  const likeActive = userReactions.includes('LIKE')
  const dislikeActive = userReactions.includes('DISLIKE')
  const likeCount = reactionCounts?.LIKE || 0
  const dislikeCount = reactionCounts?.DISLIKE || 0

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onReact('LIKE')}
        className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-all ${
          likeActive
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-emerald-400'
        }`}
        title="Like"
      >
        <ThumbsUp className={`w-4 h-4 ${likeActive ? 'fill-current' : ''}`} />
        {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
      </button>
      <button
        onClick={() => onReact('DISLIKE')}
        className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-all ${
          dislikeActive
            ? 'bg-red-500/15 text-red-400'
            : 'text-[var(--text-muted)] hover:bg-[#1a1815] hover:text-red-400'
        }`}
        title="Dislike"
      >
        <ThumbsDown className={`w-4 h-4 ${dislikeActive ? 'fill-current' : ''}`} />
        {dislikeCount > 0 && <span className="text-xs font-medium">{dislikeCount}</span>}
      </button>
    </div>
  )
}
