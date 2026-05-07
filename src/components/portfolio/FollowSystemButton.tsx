'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FollowSystemButtonProps {
  systemSlug: string
  initiallyFollowing: boolean
}

// Toggles a single UserSystemAssignment for the calling user via
// /api/me/risk-onboarding/system-decision (the same endpoint the quiz
// result screen uses). The endpoint is idempotent and accepts any valid
// system slug, so the quiz framing is incidental.
export function FollowSystemButton({
  systemSlug,
  initiallyFollowing,
}: FollowSystemButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticFollowing, setOptimisticFollowing] = useState(initiallyFollowing)
  const [isSaving, setIsSaving] = useState(false)
  const busy = isSaving || isPending

  const handleClick = async () => {
    if (busy) return
    const next = !optimisticFollowing
    setOptimisticFollowing(next)
    setIsSaving(true)
    try {
      const res = await fetch('/api/me/risk-onboarding/system-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemSlug, accept: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to update')
      }
      toast.success(next ? 'Following — daily signals will arrive by email.' : 'Unfollowed.')
      startTransition(() => router.refresh())
    } catch (err) {
      setOptimisticFollowing(!next)
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setIsSaving(false)
    }
  }

  if (optimisticFollowing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-[var(--success)] transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)' }}
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Following
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold-400)] bg-[var(--gold-400)] px-3 py-1 text-xs font-semibold text-[var(--text-inverse)] transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      Follow this system
    </button>
  )
}
