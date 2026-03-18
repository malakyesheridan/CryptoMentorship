'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRiskProfile } from '@/hooks/useRiskProfile'
import { RiskOnboardingModal } from './RiskOnboardingModal'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'riskOnboarding.dismissedAt'

export function RiskOnboardingGate() {
  const { data } = useRiskProfile()
  const [open, setOpen] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  useEffect(() => {
    if (!data) return
    if (data.status === 'completed') return
    if (typeof window === 'undefined') return

    const dismissed = window.localStorage.getItem(DISMISS_KEY)
    if (!dismissed) {
      setOpen(true)
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    }
  }, [data])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    }
  }

  const recommendedLabel = data?.recommendedProfile ? formatRiskProfileLabel(data.recommendedProfile) : null
  const effectiveLabel = data?.effectiveProfile ? formatRiskProfileLabel(data.effectiveProfile) : null

  return (
    <>
      <RiskOnboardingModal open={open} onOpenChange={handleOpenChange} />

      {data?.status !== 'completed' && (
        <div className="mb-8 rounded-2xl border border-[var(--gold-400)]/30 bg-[#2a2418] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--gold-400)]">Get your recommended profile (2 mins)</p>
            <p className="text-sm text-[var(--gold-400)]">
              {data?.status === 'in_progress'
                ? 'You are part-way through. Resume to get your recommendation.'
                : 'Answer a few quick questions to personalize your daily updates.'}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="min-h-[44px]">
            {data?.status === 'in_progress' ? 'Resume' : 'Start'}
          </Button>
        </div>
      )}

      {data?.status === 'completed' && (
        <div className="mb-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Your recommended profile</p>
              <h3 className="text-2xl font-semibold text-[var(--text-strong)]">{recommendedLabel}</h3>
              {effectiveLabel && effectiveLabel !== recommendedLabel && (
                <p className="text-sm text-[var(--text-muted)] mt-1">Current default: {effectiveLabel}</p>
              )}
              {data?.overriddenByAdmin && data?.adminOverrideProfile && (
                <p className="text-xs text-amber-600 mt-1">Admin override applied</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setShowWhy((prev) => !prev)}>
                {showWhy ? 'Hide' : 'Why?'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(true)}>
                Retake
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'mt-4 rounded-xl border border-[var(--border-subtle)] bg-[#1a1815] p-4 text-sm text-[var(--text-strong)]',
              showWhy ? 'block' : 'hidden'
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Drivers</p>
            <ul className="mt-2 space-y-1">
              {(data?.drivers || []).map((driver) => (
                <li key={driver}>- {driver}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

