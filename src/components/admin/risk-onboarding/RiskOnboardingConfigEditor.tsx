'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  computeMaxScore,
  type RiskOnboardingScoringConfig,
} from '@/lib/riskOnboarding/config'
import { cn } from '@/lib/utils'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'

const likertOptions = [
  { id: 'strongly_agree', label: 'Strongly agree' },
  { id: 'agree', label: 'Agree' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'disagree', label: 'Disagree' },
  { id: 'strongly_disagree', label: 'Strongly disagree' },
] as const

type LikertId = (typeof likertOptions)[number]['id']

export function RiskOnboardingConfigEditor() {
  const [config, setConfig] = useState<RiskOnboardingScoringConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/risk-onboarding')
        const data = await res.json()
        const { maxScore: _maxScore, ...rest } = data
        setConfig(rest)
      } catch (error) {
        toast.error('Failed to load risk onboarding settings')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const maxScore = useMemo(() => (config ? computeMaxScore(config) : 0), [config])

  const updateQuestion = (questionId: string, updater: (question: RiskOnboardingScoringConfig['questions'][number]) => RiskOnboardingScoringConfig['questions'][number]) => {
    setConfig((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        questions: prev.questions.map((question) =>
          question.id === questionId ? updater(question) : question
        ),
      }
    })
  }

  const updateOptionScore = (questionId: string, optionId: string, value: number) => {
    setConfig((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        scoring: {
          ...prev.scoring,
          options: {
            ...prev.scoring.options,
            [questionId]: {
              ...(prev.scoring.options[questionId] || {}),
              [optionId]: value,
            },
          },
        },
      }
    })
  }

  const updateLikertScore = (statementId: string, optionId: LikertId, value: number) => {
    setConfig((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        scoring: {
          ...prev.scoring,
          likertStatements: {
            ...prev.scoring.likertStatements,
            [statementId]: {
              ...(prev.scoring.likertStatements[statementId] || {}),
              [optionId]: value,
            },
          },
        },
      }
    })
  }

  const handleSave = async () => {
    if (!config) return
    setIsSaving(true)
    setErrors([])
    try {
      const res = await fetch('/api/admin/risk-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreMeaning: config.scoreMeaning,
          scoreRanges: config.scoreRanges,
          questions: config.questions,
          scoring: config.scoring,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const details = Array.isArray(data.details) ? data.details : ['Unable to save configuration.']
        setErrors(details)
        toast.error(data.error || 'Failed to save configuration')
        return
      }
      const { maxScore: _maxScore, ...rest } = data
      setConfig(rest)
      toast.success('Risk onboarding settings updated')
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="heading-hero text-3xl sm:text-4xl">
          <span>Risk</span> <span className="gold">Onboarding Settings</span>
        </h1>
        <p className="subhead">
          Customize question wording, scoring weights, and risk profile thresholds.
        </p>
        <div className="text-xs text-slate-500">
          Current max raw score: {maxScore} (scores normalize to 0–100)
        </div>
      </div>

      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-red-700">Fix the following before saving:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-red-700 space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="card">
        <CardHeader>
          <CardTitle>Score meaning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={config.scoreMeaning}
            onChange={(event) => setConfig((prev) => (prev ? { ...prev, scoreMeaning: event.target.value } : prev))}
            rows={3}
          />
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle>Score ranges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.scoreRanges.map((range, index) => (
            <div key={range.profile} className="rounded-2xl border border-[color:var(--border-subtle)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatRiskProfileLabel(range.profile)}
                  </p>
                  <p className="text-xs text-slate-500">Profile tag</p>
                </div>
                <Badge variant="outline">{range.profile}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Label</label>
                  <Input
                    value={range.label}
                    onChange={(event) => {
                      const value = event.target.value
                      setConfig((prev) => {
                        if (!prev) return prev
                        const next = [...prev.scoreRanges]
                        next[index] = { ...next[index], label: value }
                        return { ...prev, scoreRanges: next }
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Min score</label>
                  <Input
                    type="number"
                    value={range.min}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setConfig((prev) => {
                        if (!prev) return prev
                        const next = [...prev.scoreRanges]
                        next[index] = { ...next[index], min: Number.isNaN(value) ? 0 : value }
                        return { ...prev, scoreRanges: next }
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max score</label>
                  <Input
                    type="number"
                    value={range.max}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setConfig((prev) => {
                        if (!prev) return prev
                        const next = [...prev.scoreRanges]
                        next[index] = { ...next[index], max: Number.isNaN(value) ? 0 : value }
                        return { ...prev, scoreRanges: next }
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Description</label>
                  <Input
                    value={range.description}
                    onChange={(event) => {
                      const value = event.target.value
                      setConfig((prev) => {
                        if (!prev) return prev
                        const next = [...prev.scoreRanges]
                        next[index] = { ...next[index], description: value }
                        return { ...prev, scoreRanges: next }
                      })
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {config.questions.map((question) => {
          const questionScores = config.scoring.options[question.id] || {}
          return (
            <Card key={question.id} className="card">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{question.title}</span>
                  <Badge variant="outline">{question.id}</Badge>
                </CardTitle>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="uppercase tracking-wide">{question.type}</span>
                  {question.optional && <span>Optional</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Question title</label>
                    <Input
                      value={question.title}
                      onChange={(event) =>
                        updateQuestion(question.id, (prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Description (optional)</label>
                    <Textarea
                      value={question.description || ''}
                      onChange={(event) =>
                        updateQuestion(question.id, (prev) => ({
                          ...prev,
                          description: event.target.value || undefined,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={!!question.optional}
                      onChange={(event) =>
                        updateQuestion(question.id, (prev) => ({
                          ...prev,
                          optional: event.target.checked,
                        }))
                      }
                    />
                    Mark as optional
                  </label>
                </div>

                {question.type === 'single' && question.options && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-700">Options & scoring</div>
                    <div className="grid gap-3">
                      {question.options.map((option) => (
                        <div key={option.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                          <div className="md:col-span-2">
                            <label className="text-xs text-slate-500">Option label</label>
                            <Input
                              value={option.label}
                              onChange={(event) =>
                                updateQuestion(question.id, (prev) => ({
                                  ...prev,
                                  options: prev.options?.map((item) =>
                                    item.id === option.id
                                      ? { ...item, label: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Score</label>
                            <Input
                              type="number"
                              value={questionScores[option.id] ?? 0}
                              onChange={(event) => {
                                const value = Number(event.target.value)
                                updateOptionScore(question.id, option.id, Number.isNaN(value) ? 0 : value)
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.type === 'likert-group' && question.statements && (
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-slate-700">Statements & scoring</div>
                    {question.statements.map((statement) => {
                      const mapping = config.scoring.likertStatements[statement.id] || {}
                      return (
                        <div key={statement.id} className="rounded-2xl border border-[color:var(--border-subtle)] p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-800">{statement.id}</div>
                            <Badge variant="outline">Statement</Badge>
                          </div>
                          <Input
                            value={statement.label}
                            onChange={(event) =>
                              updateQuestion(question.id, (prev) => ({
                                ...prev,
                                statements: prev.statements?.map((item) =>
                                  item.id === statement.id ? { ...item, label: event.target.value } : item
                                ),
                              }))
                            }
                          />
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {likertOptions.map((option) => (
                              <div key={option.id}>
                                <label className="text-[10px] uppercase tracking-wide text-slate-500">
                                  {option.label}
                                </label>
                                <Input
                                  type="number"
                                  value={mapping[option.id] ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value)
                                    updateLikertScore(statement.id, option.id, Number.isNaN(value) ? 0 : value)
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className={cn('flex justify-end')}>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}
