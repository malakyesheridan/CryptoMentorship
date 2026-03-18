'use client'

import { useState, useRef, useEffect } from 'react'

interface ProfileData {
  name: string | null
  image: string | null
  role: string
  createdAt: string
  postCount?: number
}

interface ProfilePopoverProps {
  children: React.ReactNode
  user: ProfileData
}

export function ProfilePopover({ children, user }: ProfilePopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 300)
  }

  function handleLeave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      ref={ref}
    >
      {children}

      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 bg-[#1a1815] border border-[var(--border-subtle)] rounded-xl shadow-lg z-30 p-4">
          <div className="flex items-center gap-3 mb-3">
            {user.image ? (
              <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2a2520] flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">
                {(user.name?.[0] ?? '?').toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--text-strong)]">
                  {user.name ?? 'Anonymous'}
                </span>
                {(user.role === 'admin' || user.role === 'editor') && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--gold-400)]/20 text-[var(--gold-400)] font-medium">
                    {user.role === 'admin' ? 'Admin' : 'Editor'}
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)]">Member since {memberSince}</span>
            </div>
          </div>
          {user.postCount !== undefined && (
            <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
              {user.postCount} {user.postCount === 1 ? 'post' : 'posts'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
