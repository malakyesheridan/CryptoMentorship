'use client'

import { useState } from 'react'

interface PostContentProps {
  body: string
  imageUrl?: string | null
  truncate?: boolean
}

const MAX_CHARS = 600

export function PostContent({ body, imageUrl, truncate = true }: PostContentProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldTruncate = truncate && body.length > MAX_CHARS

  const displayText = shouldTruncate && !expanded ? body.slice(0, MAX_CHARS) + '...' : body

  return (
    <div>
      <p className="text-base text-[var(--text-strong)] whitespace-pre-wrap break-words leading-relaxed">
        {displayText}
      </p>
      {shouldTruncate && !expanded && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true) }}
          className="text-sm text-[var(--gold-400)] mt-1.5 hover:underline font-medium"
        >
          Show more
        </button>
      )}
      {imageUrl && (
        <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border-subtle)]">
          <img
            src={imageUrl}
            alt="Post image"
            className="max-h-[500px] object-contain w-full bg-[#0a0a0a]"
          />
        </div>
      )}
    </div>
  )
}
