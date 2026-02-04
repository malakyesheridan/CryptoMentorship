'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, TrendingUp, AlertCircle, Lock, Edit } from 'lucide-react'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { CalendarDatePicker } from './CalendarDatePicker'
import { buildAllocationSplits, parseAllocationAssets, type PortfolioAsset } from '@/lib/portfolio-assets'
import { useRiskProfile } from '@/hooks/useRiskProfile'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2'
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

interface DailySignalDisplayProps {
  userTier: string | null
  userRole?: string
}

type Tier = 'T1' | 'T2'
type RiskProfile = 'AGGRESSIVE' | 'SEMI' | 'CONSERVATIVE'

const tierLabels: Record<Tier, string> = {
  T1: 'Growth',
  T2: 'Elite',
}

const tierColors: Record<Tier, string> = {
  T1: 'bg-purple-50 border-purple-200',
  T2: 'bg-yellow-50 border-yellow-200',
}

const allocationLabelToProfile: Record<'Aggressive' | 'Semi Aggressive' | 'Conservative', RiskProfile> = {
  Aggressive: 'AGGRESSIVE',
  'Semi Aggressive': 'SEMI',
  Conservative: 'CONSERVATIVE',
}

// Check if user can access a tier
function canAccessTier(userTier: string | null, signalTier: Tier, isActive: boolean): boolean {
  if (!userTier || !isActive) return false
  
  const tierHierarchy: Tier[] = ['T1', 'T2']
  const userTierIndex = tierHierarchy.indexOf(userTier as Tier)
  const signalTierIndex = tierHierarchy.indexOf(signalTier)
  
  return userTierIndex >= signalTierIndex
}

type Category = 'majors' | 'memecoins'

interface DailySignalDisplayProps {
  userTier: string | null
  userRole?: string
  onEditSignal?: (signal: DailySignal) => void
}

export default function DailySignalDisplay({ userTier, userRole, onEditSignal }: DailySignalDisplayProps) {
  const [activeTier, setActiveTier] = useState<Tier | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('majors')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeAllocationProfile, setActiveAllocationProfile] = useState<RiskProfile | null>(null)
  const hasSetAllocationRef = useRef(false)
  const { data: riskProfileData } = useRiskProfile()

  // Build API URL with date parameter if selected
  const apiUrl = selectedDate
    ? `/api/portfolio-daily-signals?date=${selectedDate}&tzOffset=${new Date().getTimezoneOffset()}`
    : '/api/portfolio-daily-signals'

  const { data, error, isLoading } = useSWR<{ 
    signals: DailySignal[]
    userTier: string | null
    isActive: boolean
  }>(
    apiUrl,
    (url) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: selectedDate ? 0 : 60000, // Don't auto-refresh when viewing past dates
      dedupingInterval: 30000,
    }
  )

  // Group signals by tier (and category for T2/Elite)
  const signalsByTier = useMemo(() => {
    const signals = data?.signals || []
    const grouped: Record<Tier, DailySignal[]> = {
      T1: [],
      T2: []
    }
    
    signals.forEach(signal => {
      if (grouped[signal.tier]) {
        grouped[signal.tier].push(signal)
      }
    })
    
    return grouped
  }, [data?.signals])

  // Group T2 (Elite) signals by category
  const t2SignalsByCategory = useMemo(() => {
    const t2Signals = signalsByTier.T2
    return {
      majors: t2Signals.find(s => s.category === 'majors') || null,
      memecoins: t2Signals.find(s => s.category === 'memecoins') || null,
    }
  }, [signalsByTier.T2])

  // Reset category when tier changes away from T2
  useEffect(() => {
    if (activeTier !== 'T2') {
      setActiveCategory('majors')
    }
  }, [activeTier])

  // Set initial active tier to first available tier
  useEffect(() => {
    if (!activeTier && data?.signals) {
      const tiers: Tier[] = ['T1', 'T2']
      const firstTierWithSignal = tiers.find(tier => signalsByTier[tier].length > 0)
      if (firstTierWithSignal) {
        setActiveTier(firstTierWithSignal)
      }
    }
  }, [data?.signals, activeTier, signalsByTier])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Error loading daily updates. Please try again later.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const signals = data?.signals || []
  const isActive = data?.isActive || false
  const effectiveUserTier = data?.userTier || userTier

  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          {/* Calendar Date Picker - Above tier selector */}
          <div className="flex justify-center mb-4" data-tour="portfolio-date-picker">
            <CalendarDatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Daily Updates Available</h3>
            <p className="text-slate-600">
              {selectedDate 
                ? `No updates found for the selected date.`
                : "Check back later for today's portfolio updates."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tiers: Tier[] = ['T1', 'T2']
  
  // Get current signal based on active tier and category
  const getCurrentSignal = (): DailySignal | null => {
    if (!activeTier) return null
    if (activeTier === 'T2') {
      return t2SignalsByCategory[activeCategory]
    }
    return signalsByTier[activeTier]?.[0] || null
  }
  
  const currentSignal = getCurrentSignal()
  const hasAccess = currentSignal ? canAccessTier(effectiveUserTier, currentSignal.tier, isActive) : false
  const showAllocations = currentSignal?.category !== 'memecoins'
  const allocationAssets = currentSignal && showAllocations
    ? currentSignal.primaryAsset &&
      currentSignal.secondaryAsset &&
      currentSignal.tertiaryAsset
      ? {
          primaryAsset: currentSignal.primaryAsset as PortfolioAsset,
          secondaryAsset: currentSignal.secondaryAsset as PortfolioAsset,
          tertiaryAsset: currentSignal.tertiaryAsset as PortfolioAsset,
        }
      : parseAllocationAssets(currentSignal.signal)
    : null
  const allocationSplits = allocationAssets
    ? buildAllocationSplits(
        allocationAssets.primaryAsset,
        allocationAssets.secondaryAsset,
        allocationAssets.tertiaryAsset
      )
    : []

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

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Calendar Date Picker - Above tier selector */}
        <div className="flex justify-center mb-4" data-tour="portfolio-date-picker">
          <CalendarDatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div
            className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200 w-full sm:w-auto"
            data-tour="portfolio-tier-tabs"
          >
            {tiers.map((tier) => {
              const signal = signalsByTier[tier]?.[0]
              const hasSignal = !!signal
              const canAccess = hasSignal ? canAccessTier(effectiveUserTier, tier, isActive) : false
              const isLocked = hasSignal && !canAccess
              
              return (
                <Button
                  key={tier}
                  variant={activeTier === tier ? 'default' : 'ghost'}
                  onClick={() => hasSignal && setActiveTier(tier)}
                  disabled={!hasSignal}
                  className={cn(
                    'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 relative min-h-[44px] flex-1 sm:flex-none',
                    activeTier === tier
                      ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    !hasSignal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isLocked && <Lock className="w-4 h-4" />}
                    {tierLabels[tier]}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Category Tab Navigation (only for T2/Elite) */}
        {activeTier === 'T2' && (
          <div className="flex justify-center mb-6">
            <div
              className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200 w-full sm:w-auto"
              data-tour="portfolio-category-tabs"
            >
              {(['majors', 'memecoins'] as Category[]).map((category) => {
                const hasSignal = !!t2SignalsByCategory[category]
                const signal = t2SignalsByCategory[category]
                const canAccess = signal ? canAccessTier(effectiveUserTier, 'T2', isActive) : false
                const isLocked = hasSignal && !canAccess
                
                return (
                  <Button
                    key={category}
                    variant={activeCategory === category ? 'default' : 'ghost'}
                    onClick={() => hasSignal && setActiveCategory(category)}
                    disabled={!hasSignal}
                    className={cn(
                      'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 relative min-h-[44px] flex-1 sm:flex-none capitalize',
                      activeCategory === category
                        ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      !hasSignal && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isLocked && <Lock className="w-4 h-4" />}
                      {category === 'majors' ? 'Market Rotation' : 'Memecoins'}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Tab Content */}
        {currentSignal && (
          <div
            className={`${tierColors[currentSignal.tier]} border-2 shadow-lg rounded-lg p-6`}
            data-tour="portfolio-update-card"
          >
            {!hasAccess ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Locked Content</h3>
                <p className="text-slate-600 mb-4">
                  This update is available for {tierLabels[currentSignal.tier]} members and above.
                </p>
                <p className="text-sm text-slate-500">
                  Upgrade your subscription to access this tier&apos;s updates.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-900">
                      ⚡ Portfolio Update - {tierLabels[currentSignal.tier]}{currentSignal.category === 'majors' ? ' Market Rotation' : currentSignal.category === 'memecoins' ? ' Memecoins' : ''} ⚡
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
                    <span className="text-xs text-slate-500">
                      {formatDate(new Date(currentSignal.publishedAt), 'short')}
                    </span>
                  </div>
                </div>

                {/* Allocation Split */}
                {allocationSplits.length > 0 ? (
                  <div className="mb-4" data-tour="portfolio-allocation">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900">Allocation Split</h4>
                      {riskProfileData?.recommendedProfile && (
                        <span className="text-xs text-slate-500">
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
                                ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">{displayLabel}</span>
                                {isRecommended && (
                                  <span className="text-[10px] uppercase tracking-wide bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full">
                                    Recommended for you
                                  </span>
                                )}
                              </div>
                              {isActive && (
                                <span className="text-xs text-slate-500">Selected</span>
                              )}
                            </div>
                            {isActive && (
                              <div className="mt-3 text-sm text-slate-700">
                                {split.allocations
                                  .map((allocation) => `${allocation.percent}% ${allocation.asset}`)
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
                    <h4 className="font-bold text-slate-900 mb-2">Update:</h4>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="text-lg text-slate-800">
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
                    <h4 className="font-bold text-slate-900 mb-2">Executive Summary:</h4>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {currentSignal.executiveSummary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Associated Data */}
                {currentSignal.associatedData && (
                  <div data-tour="portfolio-data">
                    <h4 className="font-bold text-slate-900 mb-2">Associated Data:</h4>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {currentSignal.associatedData}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

