'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  RISK_ONBOARDING_WIZARD_KEY,
  RISK_STATEMENT_IDS,
  type LikertOption,
} from '@/lib/riskOnboarding/questions'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'
import { useRiskProfile } from '@/hooks/useRiskProfile'
import { useRiskOnboardingConfig } from '@/hooks/useRiskOnboardingConfig'
import type { RiskOnboardingAnswers } from '@/lib/riskOnboarding/score'

const LIKERT_OPTIONS: Array<{ id: LikertOption; label: string }> = [
  { id: 'strongly_agree', label: 'Strongly agree' },
  { id: 'agree', label: 'Agree' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'disagree', label: 'Disagree' },
  { id: 'strongly_disagree', label: 'Strongly disagree' },
]

type RiskOnboardingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RiskStatements = NonNullable<RiskOnboardingAnswers['risk_statements']>

function hasAnswerForStep(step: { id: string; type?: string; statements?: Array<{ id: string }> }, answers: RiskOnboardingAnswers) {
  if (step.type === 'likert-group') {
    const statements = answers.risk_statements || {}
    const ids = step.statements?.length ? step.statements.map((statement) => statement.id) : RISK_STATEMENT_IDS
    const statementMap = statements as Record<string, LikertOption | undefined>
    return ids.every((id) => Boolean(statementMap[id]))
  }
  return Boolean((answers as Record<string, unknown>)[step.id])
}

export function RiskOnboardingModal({ open, onOpenChange }: RiskOnboardingModalProps) {
  const router = useRouter()
  const { data, mutate } = useRiskProfile({ includeAnswers: true, includeFreeText: true })
  const { data: configData, isLoading: configLoading } = useRiskOnboardingConfig()
  const [answers, setAnswers] = useState<RiskOnboardingAnswers>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [mode, setMode] = useState<'questions' | 'result'>('questions')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  type SystemFitEntry = {
    slug: string
    shortName?: string
    fullName?: string
    color?: string
    score?: number
    fitScore?: number
    label?: string
    fitLabel?: string
    recommended: boolean
    accepted?: boolean
    declined?: boolean
    reasons: string[]
  }
  const [result, setResult] = useState<{
    recommendedProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE'
    score: number
    drivers: string[]
    systems: SystemFitEntry[]
  } | null>(null)
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, boolean>>({})
  const [savingDecisions, setSavingDecisions] = useState(false)
  const [showWhyProfile, setShowWhyProfile] = useState(false)
  const initRef = useRef(false)
  const saveTimeoutRef = useRef<number | null>(null)

  const steps = useMemo(() => configData?.questions || [], [configData?.questions])
  const currentStep = steps[stepIndex]
  const totalSteps = steps.length

  useEffect(() => {
    if (open) return
    initRef.current = false
    setMode('questions')
    setResult(null)
    setError(null)
    setStepIndex(0)
    setAnswers({})
    setIsDirty(false)
    setPendingDecisions({})
    setShowWhyProfile(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (initRef.current) return
    initRef.current = true

    if (data?.answers && typeof data.answers === 'object') {
      setAnswers(data.answers as RiskOnboardingAnswers)

      const firstIncomplete = steps.findIndex((step) => !hasAnswerForStep(step, data.answers as RiskOnboardingAnswers))
      if (firstIncomplete >= 0) {
        setStepIndex(firstIncomplete)
      }
    }

    if (data?.status === 'completed') {
      setResult({
        recommendedProfile: data.recommendedProfile || 'CONSERVATIVE',
        score: data.score || 0,
        drivers: data.drivers || [],
        systems: (data.systems || []) as SystemFitEntry[],
      })
      const initial: Record<string, boolean> = {}
      for (const s of data.systems || []) {
        // Source of truth on retake/reopen: current assignment > prior accepted
        // > recommended (default-on for first-time users).
        if (s.assigned) initial[s.slug] = true
        else if (s.declined) initial[s.slug] = false
        else if (s.accepted) initial[s.slug] = true
        else initial[s.slug] = s.recommended
      }
      setPendingDecisions(initial)
    }
  }, [open, data, steps])

  const saveAnswers = useCallback(
    async (partial: RiskOnboardingAnswers) => {
      if (!open) return
      if (!Object.keys(partial).length) return
      setSaving(true)
      try {
        await fetch('/api/me/risk-onboarding/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wizardKey: RISK_ONBOARDING_WIZARD_KEY,
            partialAnswers: partial,
            stepId: currentStep?.id,
          }),
        })
      } finally {
        setSaving(false)
      }
    },
    [open, currentStep?.id]
  )

  useEffect(() => {
    if (!open) return
    if (!initRef.current) return
    if (mode === 'result') return
    if (data?.status === 'completed' && !isDirty) return

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void saveAnswers(answers)
    }, 700)

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [answers, open, saveAnswers, data?.status, isDirty, mode])

  const updateAnswer = (key: keyof RiskOnboardingAnswers, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const updateRiskStatement = (statementId: string, value: LikertOption) => {
    setAnswers((prev) => ({
      ...prev,
      risk_statements: {
        ...(prev.risk_statements || {}),
        [statementId]: value,
      },
    }))
    setIsDirty(true)
  }

  const handleNext = async () => {
    setError(null)

    if (currentStep?.optional && !hasAnswerForStep(currentStep, answers)) {
      setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))
      return
    }

    if (currentStep && !hasAnswerForStep(currentStep, answers)) {
      setError('Please answer the question to continue.')
      return
    }

    await saveAnswers(answers)

    if (stepIndex === totalSteps - 1) {
      await handleComplete()
    } else {
      setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))
    }
  }

  const handleBack = () => {
    setError(null)
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleComplete = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/me/risk-onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wizardKey: RISK_ONBOARDING_WIZARD_KEY }),
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Unable to complete onboarding.')
        return
      }
      const data = await response.json()
      const systems: SystemFitEntry[] = data.systems || []
      setResult({
        recommendedProfile: data.recommendedProfile,
        score: data.score,
        drivers: data.drivers || [],
        systems,
      })
      // Default toggle state on first complete = recommended.
      const initial: Record<string, boolean> = {}
      for (const s of systems) initial[s.slug] = s.recommended
      setPendingDecisions(initial)
      setMode('result')
      void mutate()
      setIsDirty(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleSystem = (slug: string, next: boolean) => {
    setPendingDecisions((prev) => ({ ...prev, [slug]: next }))
  }

  const handleSaveAndGoToPortfolio = async () => {
    if (!result) {
      onOpenChange(false)
      router.push('/portfolio')
      return
    }
    setSavingDecisions(true)
    try {
      await Promise.all(
        result.systems.map((s) =>
          fetch('/api/me/risk-onboarding/system-decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemSlug: s.slug,
              accept: pendingDecisions[s.slug] ?? s.recommended,
            }),
          })
        )
      )
      void mutate()
    } finally {
      setSavingDecisions(false)
      onOpenChange(false)
      router.push('/portfolio')
    }
  }

  const progressValue = mode === 'result'
    ? 100
    : totalSteps
      ? Math.round(((stepIndex + 1) / totalSteps) * 100)
      : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen sm:w-[640px] max-w-[640px] h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl"
      >
        <div className="flex flex-col min-h-full gap-4">
          <div className="sticky top-0 bg-[var(--bg-panel)]/95 backdrop-blur border-b border-[var(--border-subtle)] py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Risk onboarding</p>
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">Build your profile</h2>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {mode === 'result' ? 'Complete' : `Step ${stepIndex + 1} of ${totalSteps}`}
              </div>
            </div>
            <div className="mt-3">
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>

          {configLoading || !configData ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--border-subtle)]" />
            </div>
          ) : mode === 'result' && result ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-strong)]">Your System Recommendations</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Based on your answers, here&rsquo;s what we recommend.
                </p>
              </div>

              <div className="space-y-3">
                {result.systems.map((sys) => {
                  const score = sys.fitScore ?? sys.score ?? 0
                  const label = sys.fitLabel ?? sys.label ?? ''
                  const isOn = pendingDecisions[sys.slug] ?? sys.recommended
                  const accent = sys.color || 'var(--gold-400)'
                  return (
                    <div
                      key={sys.slug}
                      className="rounded-2xl border-l-4 border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4"
                      style={{ borderLeftColor: accent }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: accent }}
                          >
                            {sys.shortName ?? sys.slug.toUpperCase()}
                          </div>
                          {sys.fullName && (
                            <div className="mt-0.5 text-sm text-[var(--text-muted)] truncate">
                              {sys.fullName}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                            {label}
                          </div>
                          <div className="text-lg font-bold tabular-nums text-[var(--text-strong)]">
                            {score}/100
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-skeleton)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, background: accent }}
                        />
                      </div>

                      {sys.reasons.length > 0 && (
                        <ul className="mt-3 space-y-1 text-sm text-[var(--text-strong)]">
                          {sys.reasons.map((r) => (
                            <li key={r} className="flex gap-2">
                              <span aria-hidden className="text-[var(--text-muted)]">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <label className="mt-4 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer"
                          checked={isOn}
                          onChange={(e) => handleToggleSystem(sys.slug, e.target.checked)}
                          disabled={savingDecisions}
                        />
                        <span className="text-sm font-medium text-[var(--text-strong)]">
                          {isOn ? 'Following this system' : 'Follow this system'}
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      Your risk profile
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">
                      {formatRiskProfileLabel(result.recommendedProfile)} · {result.score}/100
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWhyProfile((v) => !v)}
                  >
                    {showWhyProfile ? 'Hide' : 'Why this profile?'}
                  </Button>
                </div>
                {showWhyProfile && result.drivers.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-[var(--text-strong)]">
                    {result.drivers.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden className="text-[var(--text-muted)]">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="sticky bottom-0 bg-[var(--bg-panel)]/95 backdrop-blur border-t border-[var(--border-subtle)] pt-4">
                <Button
                  onClick={handleSaveAndGoToPortfolio}
                  disabled={savingDecisions}
                  className="w-full"
                >
                  {savingDecisions ? 'Saving…' : 'Save & Go to Portfolio'}
                </Button>
                <p className="mt-2 text-xs text-[var(--text-muted)] text-center">
                  Your portfolio will show only the systems you follow.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentStep && (
                <div>
                  <h3 className="text-xl font-semibold text-[var(--text-strong)]">{currentStep.title}</h3>

                  {currentStep.id === 'goal' && answers.goal === 'other' && (
                    <div className="mt-4">
                      <label className="text-sm text-[var(--text-strong)]">Tell us more</label>
                      <Input
                        value={answers.goal_other_text || ''}
                        onChange={(event) => updateAnswer('goal_other_text', event.target.value)}
                        placeholder="Share your primary goal"
                        className="mt-2"
                      />
                    </div>
                  )}

                  {currentStep.id === 'own_crypto' && answers.own_crypto === 'yes' && (
                    <div className="mt-4">
                      <label className="text-sm text-[var(--text-strong)]">What do you hold? (optional)</label>
                      <Input
                        value={answers.holdings_text || ''}
                        onChange={(event) => updateAnswer('holdings_text', event.target.value)}
                        placeholder="BTC, ETH, etc"
                        className="mt-2"
                      />
                    </div>
                  )}

                  {currentStep.id === 'confidence_level' && (
                    <div className="mt-4">
                      <label className="text-sm text-[var(--text-strong)]">Anything you want to learn more about? (optional)</label>
                      <Input
                        value={answers.learn_more_text || ''}
                        onChange={(event) => updateAnswer('learn_more_text', event.target.value)}
                        placeholder="Topics you want help with"
                        className="mt-2"
                      />
                    </div>
                  )}

                  {currentStep.type === 'single' && currentStep.options && (
                    <div className="mt-6 space-y-3">
                      {currentStep.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => updateAnswer(currentStep.id as keyof RiskOnboardingAnswers, option.id)}
                          className={cn(
                            'w-full text-left rounded-2xl border px-4 py-4 text-sm font-medium transition-all min-h-[48px]',
                            answers[currentStep.id as keyof RiskOnboardingAnswers] === option.id
                              ? 'border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-strong)] shadow-md'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-strong)] hover:border-[var(--border-subtle)]'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentStep.type === 'likert-group' && currentStep.statements && (
                    <div className="mt-6 space-y-6">
                      {currentStep.statements.map((statement) => (
                        <div key={statement.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                          <p className="text-sm font-medium text-[var(--text-strong)]">{statement.label}</p>
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
                            {LIKERT_OPTIONS.map((option) => {
                              const currentValue = answers.risk_statements?.[statement.id as keyof RiskStatements]
                              const isActive = currentValue === option.id
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => updateRiskStatement(statement.id, option.id)}
                                  className={cn(
                                    'rounded-xl border px-3 py-2 text-xs font-semibold min-h-[44px]',
                                    isActive
                                      ? 'border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-strong)]'
                                      : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-strong)] hover:border-[var(--border-subtle)]'
                                  )}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--bg-danger-subtle)] px-3 py-2 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <div className="sticky bottom-0 bg-[var(--bg-panel)]/95 backdrop-blur border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <Button variant="ghost" onClick={handleBack} disabled={stepIndex === 0}>
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    {currentStep?.optional && !hasAnswerForStep(currentStep, answers) && (
                      <Button variant="outline" onClick={() => setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))}>
                        Skip
                      </Button>
                    )}
                    <Button onClick={handleNext} disabled={saving || submitting}>
                      {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  {saving ? 'Saving...' : 'Progress saves automatically'}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

