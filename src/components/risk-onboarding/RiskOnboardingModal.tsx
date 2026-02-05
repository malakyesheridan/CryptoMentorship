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
    return ids.every((id) => Boolean(statements[id]))
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
  const [result, setResult] = useState<{
    recommendedProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE'
    score: number
    drivers: string[]
  } | null>(null)
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
      })
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
      setResult({
        recommendedProfile: data.recommendedProfile,
        score: data.score,
        drivers: data.drivers || [],
      })
      setMode('result')
      void mutate()
      setIsDirty(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetDefault = async () => {
    if (!result) return
    await fetch('/api/me/risk-profile/set-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: result.recommendedProfile }),
    })
    void mutate()
  }

  const handleGoToPortfolio = () => {
    onOpenChange(false)
    router.push('/portfolio')
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
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk onboarding</p>
                <h2 className="text-lg font-semibold text-slate-900">Build your profile</h2>
              </div>
              <div className="text-xs text-slate-500">
                {mode === 'result' ? 'Complete' : `Step ${stepIndex + 1} of ${totalSteps}`}
              </div>
            </div>
            <div className="mt-3">
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>

          {configLoading || !configData ? (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
            </div>
          ) : mode === 'result' && result ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Recommended profile</p>
                <h3 className="text-2xl font-semibold text-emerald-900">
                  {formatRiskProfileLabel(result.recommendedProfile)}
                </h3>
                <p className="text-sm text-emerald-700 mt-2">Score: {result.score} / 100</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-800">Why this fit</h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {result.drivers.map((driver) => (
                    <li key={driver}>- {driver}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Score ranges</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {configData.scoreRanges.map((range) => (
                    <div key={range.profile} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{range.label}</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {range.min}–{range.max}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">{range.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{configData.scoreMeaning}</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleSetDefault}>Set my default to this profile</Button>
                <Button variant="outline" onClick={handleGoToPortfolio}>
                  Go to Portfolio
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentStep && (
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{currentStep.title}</h3>

                  {currentStep.id === 'goal' && answers.goal === 'other' && (
                    <div className="mt-4">
                      <label className="text-sm text-slate-600">Tell us more</label>
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
                      <label className="text-sm text-slate-600">What do you hold? (optional)</label>
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
                      <label className="text-sm text-slate-600">Anything you want to learn more about? (optional)</label>
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
                              ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
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
                        <div key={statement.id} className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-sm font-medium text-slate-800">{statement.label}</p>
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
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
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
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 pt-4">
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
                <div className="mt-2 text-xs text-slate-400">
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

