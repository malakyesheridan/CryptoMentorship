'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Trash2, Flag, Pin } from 'lucide-react'

interface PostActionsProps {
  postId: string
  isAuthor: boolean
  isAdmin: boolean
  isPinned?: boolean
  onDelete?: () => void
  onPin?: () => void
  onReport?: () => void
}

export function PostActions({ isAuthor, isAdmin, isPinned, onDelete, onPin, onReport }: PostActionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors rounded"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1815] border border-[var(--border-subtle)] rounded-lg shadow-lg z-20 py-1">
          {isAdmin && onPin && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-panel)] flex items-center gap-2"
            >
              <Pin className="w-3.5 h-3.5" />
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {!isAuthor && onReport && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReport(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-panel)] flex items-center gap-2"
            >
              <Flag className="w-3.5 h-3.5" />
              Report
            </button>
          )}
          {(isAuthor || isAdmin) && onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--bg-panel)] flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
