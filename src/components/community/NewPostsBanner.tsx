'use client'

import { useState, useEffect, useRef } from 'react'

interface NewPostsBannerProps {
  onRefresh: () => void
}

export function NewPostsBanner({ onRefresh }: NewPostsBannerProps) {
  const [newCount, setNewCount] = useState(0)
  const lastCheckRef = useRef(new Date().toISOString())

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/community/posts/new-count?since=${encodeURIComponent(lastCheckRef.current)}`
        )
        if (res.ok) {
          const data = await res.json()
          setNewCount(data.count)
        }
      } catch {
        // ignore polling errors
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

  if (newCount === 0) return null

  return (
    <button
      onClick={() => {
        lastCheckRef.current = new Date().toISOString()
        setNewCount(0)
        onRefresh()
      }}
      className="w-full py-2 text-sm text-[var(--gold-400)] bg-[var(--gold-400)]/10 border border-[var(--gold-400)]/20 rounded-lg hover:bg-[var(--gold-400)]/15 transition-colors mb-4"
    >
      {newCount} new {newCount === 1 ? 'post' : 'posts'} available
    </button>
  )
}
