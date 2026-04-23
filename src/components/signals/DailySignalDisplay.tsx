'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, TrendingUp, AlertCircle, Edit } from 'lucide-react'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { CalendarDatePicker } from './CalendarDatePicker'
import { buildAllocationSplits, parseAllocationAssets, getAssetDisplayLabel, type PortfolioAsset } from '@/lib/portfolio-assets'
import { useRiskProfile } from '@/hooks/useRiskProfile'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'

interface DailySignal {
  id: string
  tier: string
  category?: 'majors' | 'memecoins' | null
  riskProfile?: 'AGGRESSIVE' | 'SEMI' | 'CONSERVATIVE' | null
  signal: string
  primaryAsset?: string | null
  secondaryAsset?: string | null
  tertiaryAsset?: string | null
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: string
  createdBy?: {
    id: string
    name: string | null
  } | null
}

type RiskProfile = 'AGGRESSIVE' | 'SEMI' | 'CONSERVATIVE'
type Category = 'majors' | 'memecoins'

const CATEGORY_LABELS: Record<Category, string> = {
  majors: 'Market Rotation',
  memecoins: 'Memecoins',
}

// Category-based colouring — majors get the brand gold, memecoins get a
// complementary purple accent so the two feeds are visually distinct.
const CATEGORY_STYLES: Record<Category, string> = {
  majors: 'bg-amber-500/10 border-amber-500/30',
  memecoins: 'bg-purple-500/10 border-purple-500/30',
}

const allocationLabelToProfile: Record<'Aggressive' | 'Semi Aggressive' | 'Conservative', RiskProfile> = {
  Aggressive: 'AGGRESSIVE',
  'Semi Aggressive': 'SEMI',
  Conservative: 'CONSERVATIVE',
}

interface DailySignalDisplayProps {
  userRole?: string
  onEditSignal?: (signal: DailySignal) => void
}

export default function DailySignalDisplay({ userRole, onEditSignal }: DailySignalDisplayProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('majors')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeAllocationProfile, setActiveAllocationProfile] = useState<RiskProfile | null>(null)
  const hasSetAllocationRef = useRef(false)
  const { data: riskProfileData } = useRiskProfile()

  const apiUrl = selectedDate
    ? `/api/portfolio-daily-signals?date=${selectedDate}&tzOffset=${new Date().getTimezoneOffset()}`
    : '/api/portfolio-daily-signals'

  const { data, error, isLoading } = useSWR<{
    signals: DailySignal[]
    isActive: boolean
  }>(
    apiUrl,
    (url) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: selectedDate ? 0 : 60000,
      dedupingInterval: 30000,
    }
  )

  // Group signals by category. We pick the most recent signal per category so
  // if multiple signals exist for the same date only the latest is shown.
  const signalsByCategory = useMemo(() => {
    const signals = data?.signals ?? []
    return {
      majors: signals.find(s => s.category === 'majors' || s.category == null) ?? null,
      memecoins: signals.find(s => s.category === 'memecoins') ?? null,
    }
  }, [data?.signals])

  const signals = data?.signals ?? []
  const currentSignal = signalsByCategory[activeCategory]
  const currentSignalId = currentSignal?.id
  const currentSignalCategory = currentSignal?.category
  const currentSignalPrimary = currentSignal?.primaryAsset
  const currentSignalSecondary = currentSignal?.secondaryAsset
  const currentSignalTertiary = currentSignal?.tertiaryAsset
  const currentSignalText = currentSignal?.signal ?? ''

  const allocationSplits = useMemo(() => {
    if (!currentSignalId || currentSignalCategory === 'memecoins') return []
    const allocationAssets = currentSignalPrimary &&
      currentSignalSecondary &&
      currentSignalTertiary
      ? {
          primaryAsset: currentSignalPrimary as PortfolioAsset,
          secondaryAsset: currentSignalSecondary as PortfolioAsset,
          tertiaryAsset: currentSignalTertiary as PortfolioAsset,
        }
      : parseAllocationAssets(currentSignalText)

    if (!allocationAssets) return []

    return buildAllocationSplits(
      allocationAssets.primaryAsset,
      allocationAssets.secondaryAsset,
      allocationAssets.tertiaryAsset
    )
  }, [
    currentSignalId,
    currentSignalCategory,
    currentSignalPrimary,
    currentSignalSecondary,
    currentSignalTertiary,
    currentSignalText
  ])

  useEffect(() => {
    hasSetAllocationRef.current = false
    setActiveAllocationProfile(null)
  }, [currentSignal?.id])

  useEffect(() => {
    if (hasSetAllocationRef.current) return
    if (!allocationSplits.length) return
    const preferredProfile = riskProfileData?.effectiveProfile || riskProfileData?.recommendedProfile
    if (preferredProfile) {
      setActiveAllocationProfile(preferredProfile)
      hasSetAllocationRef.current = true
      return
    }
    const fallbackProfile = allocationLabelToProfile[allocationSplits[0].label]
    setActiveAllocationProfile(fallbackProfile)
    hasSetAllocationRef.current = true
  }, [allocationSplits, riskProfileData?.effectiveProfile, riskProfileData?.recommendedProfile])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-[var(--danger)]/40 bg-[var(--bg-danger-subtle)]">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-[var(--danger)]">
            <AlertCircle className="w-5 h-5" />
            <span>Error loading daily updates. Please try again later.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center mb-4" data-tour="portfolio-date-picker">
            <CalendarDatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-strong)] mb-2">No Daily Updates Available</h3>
            <p className="text-[var(--text-muted)]">
              {selectedDate
                ? `No updates found for the selected date.`
                : "Check back later for today's portfolio updates."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-center mb-4" data-tour="portfolio-date-picker">
          <CalendarDatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Category Tab Navigation — majors / memecoins */}
        <div className="flex justify-center mb-6">
          <div
            className="bg-[var(--bg-panel)] rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-[var(--border-subtle)] w-full sm:w-auto"
            data-tour="portfolio-category-tabs"
          >
            {(['majors', 'memecoins'] as Category[]).map((category) => {
              const hasSignal = !!signalsByCategory[category]
              return (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'ghost'}
                  onClick={() => hasSignal && setActiveCategory(category)}
                  disabled={!hasSignal}
                  className={cn(
                    'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 relative min-h-[44px] flex-1 sm:flex-none',
                    activeCategory === category
                      ? 'bg-yellow-500 text-white shadow-md hover:bg-gold-600'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-strong)]',
                    !hasSignal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {CATEGORY_LABELS[category]}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Active Tab Content */}
        {currentSignal && (
          <div
            className={`${CATEGORY_STYLES[(currentSignal.category as Category) ?? 'majors']} border-2 shadow-lg rounded-lg p-6`}
            data-tour="portfolio-update-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-[var(--text-strong)]">
                  ⚡ Portfolio Update — {CATEGORY_LABELS[(currentSignal.category as Category) ?? 'majors']} ⚡
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {(userRole === 'admin' || userRole === 'editor') && onEditSignal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditSignal(currentSignal)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                )}
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(new Date(currentSignal.publishedAt), 'short')}
                </span>
              </div>
            </div>

            {/* Allocation Split */}
            {allocationSplits.length > 0 ? (
              <div className="mb-4" data-tour="portfolio-allocation">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[var(--text-strong)]">Allocation Split</h4>
                  {riskProfileData?.recommendedProfile && (
                    <span className="text-xs text-[var(--text-muted)]">
                      Recommended: {formatRiskProfileLabel(riskProfileData.recommendedProfile)}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {allocationSplits.map((split) => {
                    const profile = allocationLabelToProfile[split.label]
                    const displayLabel = formatRiskProfileLabel(profile)
                    const isActive = activeAllocationProfile
                      ? activeAllocationProfile === profile
                      : allocationSplits[0]?.label === split.label
                    const isRecommended = riskProfileData?.recommendedProfile === profile

                    return (
                      <button
                        key={split.label}
                        type="button"
                        onClick={() => setActiveAllocationProfile(profile)}
                        className={cn(
                          'w-full text-left rounded-2xl border p-4 transition-all',
                          isActive
                            ? 'border-amber-400 bg-amber-500/10 shadow-sm'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-[var(--border-subtle)]'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--text-strong)]">{displayLabel}</span>
                            {isRecommended && (
                              <span className="text-[10px] uppercase tracking-wide bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full">
                                Recommended for you
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-xs text-[var(--text-muted)]">Selected</span>
                          )}
                        </div>
                        {isActive && (
                          <div className="mt-3 text-sm text-[var(--text-strong)]">
                            {split.allocations
                              .map((allocation) => `${allocation.percent}% ${getAssetDisplayLabel(allocation.asset)}`)
                              .join(' / ')}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-4" data-tour="portfolio-allocation">
                <h4 className="font-bold text-[var(--text-strong)] mb-2">Update:</h4>
                <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border-subtle)]">
                  <div className="text-lg text-[var(--text-strong)]">
                    {currentSignal.signal.split('\n').map((line, index) => (
                      <p key={index} className="mb-1 last:mb-0">
                        {line.trim() || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Executive Summary */}
            {currentSignal.executiveSummary && (
              <div className="mb-4" data-tour="portfolio-summary">
                <h4 className="font-bold text-[var(--text-strong)] mb-2">Executive Summary:</h4>
                <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border-subtle)]">
                  <p className="text-[var(--text-strong)] whitespace-pre-wrap">
                    {currentSignal.executiveSummary}
                  </p>
                </div>
              </div>
            )}

            {/* Associated Data */}
            {currentSignal.associatedData && (
              <div data-tour="portfolio-data">
                <h4 className="font-bold text-[var(--text-strong)] mb-2">Associated Data:</h4>
                <div className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border-subtle)]">
                  <p className="text-[var(--text-strong)] whitespace-pre-wrap">
                    {currentSignal.associatedData}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
