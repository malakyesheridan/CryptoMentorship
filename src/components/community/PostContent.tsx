'use client'

import { useState } from 'react'

interface PostContentProps {
  body: string
  imageUrl?: string | null
  truncate?: boolean
}

const MAX_CHARS = 400

export function PostContent({ body, imageUrl, truncate = true }: PostContentProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldTruncate = truncate && body.length > MAX_CHARS

  const displayText = shouldTruncate && !expanded ? body.slice(0, MAX_CHARS) + '...' : body

  return (
    <div>
      <p className="text-sm text-[var(--text-strong)] whitespace-pre-wrap break-words">
        {displayText}
      </p>
      {shouldTruncate && !expanded && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true) }}
          className="text-xs text-[var(--gold-400)] mt-1 hover:underline"
        >
          Show more
        </button>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Post image"
          className="mt-3 rounded-lg max-h-80 object-cover w-full"
        />
      )}
    </div>
  )
}
