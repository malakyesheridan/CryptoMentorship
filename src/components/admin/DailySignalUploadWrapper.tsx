'use client'

import { useState, useEffect } from 'react'
import DailySignalUpload from './DailySignalUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailySignalUploadWrapperProps {
  userRole?: string
  editingSignal?: {
    id: string
    tier: 'T1' | 'T2' | 'T3' // Allow T3 for backward compatibility with existing data
    category?: 'majors' | 'memecoins' | null
    signal: string
    primaryAsset?: string | null
    secondaryAsset?: string | null
    tertiaryAsset?: string | null
    executiveSummary?: string | null
    associatedData?: string | null
  } | null
  onEditComplete?: () => void
}

type Tier = 'T1' | 'T2'

const tierLabels: Record<Tier, string> = {
  T1: 'Growth',
  T2: 'Elite',
}

type Category = 'majors' | 'memecoins'

export default function DailySignalUploadWrapper({ userRole, editingSignal, onEditComplete }: DailySignalUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTier, setActiveTier] = useState<Tier>('T1')
  const [activeCategory, setActiveCategory] = useState<Category>('majors')

  const mapEditingSignal = (signal: NonNullable<DailySignalUploadWrapperProps['editingSignal']>) => {
    if (signal.tier === 'T3') {
      return { tier: 'T2' as Tier, category: signal.category ?? 'majors' }
    }
    if (signal.tier === 'T2' && signal.category) {
      return { tier: 'T2' as Tier, category: signal.category }
    }
    return { tier: 'T1' as Tier, category: undefined }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset category when tier changes
  useEffect(() => {
    if (activeTier !== 'T2') {
      setActiveCategory('majors')
    }
  }, [activeTier])

  // When editing signal is provided, set the active tier/category and scroll to form
  useEffect(() => {
    if (editingSignal) {
      const mapped = mapEditingSignal(editingSignal)
      setActiveTier(mapped.tier)
      if (mapped.tier === 'T2' && mapped.category) {
        setActiveCategory(mapped.category)
      }
      // Scroll to upload section
      setTimeout(() => {
        const uploadSection = document.getElementById('daily-signal-upload')
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [editingSignal])

  if (!mounted) {
    return <div className="h-32" />
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return null
  }

  return (
    <Card id="daily-signal-upload" className="mb-8">
      <CardContent className="pt-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-2xl font-bold text-slate-900">Daily Portfolio Updates</h2>
          </div>
          <p className="text-slate-600">
            Create daily updates for each tier. Users will see updates for their tier and all lower tiers.
          </p>
        </div>

        {/* Tier Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200 w-full sm:w-auto">
            {(['T1', 'T2'] as Tier[]).map((tier) => (
              <Button
                key={tier}
                variant={activeTier === tier ? 'default' : 'ghost'}
                onClick={() => setActiveTier(tier)}
                className={cn(
                  'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 min-h-[44px] flex-1 sm:flex-none',
                  activeTier === tier
                    ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {tierLabels[tier]}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Tab Navigation (only for T2/Elite) */}
        {activeTier === 'T2' && (
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200 w-full sm:w-auto">
              {(['majors', 'memecoins'] as Category[]).map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 min-h-[44px] flex-1 sm:flex-none capitalize',
                    activeCategory === category
                      ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {category === 'majors' ? 'Market Rotation' : 'Memecoins'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active Tab Content */}
        {([
          { tier: 'T1' as Tier, category: undefined },
          { tier: 'T2' as Tier, category: 'majors' as Category },
          { tier: 'T2' as Tier, category: 'memecoins' as Category },
        ]).map((form) => {
          const isActive = activeTier === form.tier && (form.tier !== 'T2' || activeCategory === form.category)
          const mappedEditing = editingSignal ? mapEditingSignal(editingSignal) : null
          const shouldHydrate = mappedEditing
            ? mappedEditing.tier === form.tier && (form.tier !== 'T2' || mappedEditing.category === form.category)
            : false

          return (
            <div key={`${form.tier}-${form.category ?? 'default'}`} className={isActive ? 'block' : 'hidden'}>
              <DailySignalUpload 
                tier={form.tier}
                category={form.category}
                userRole={userRole}
                formIdPrefix={`${form.tier}-${form.category ?? 'default'}`}
                existingSignal={editingSignal && shouldHydrate
                  ? {
                      id: editingSignal.id,
                      signal: editingSignal.signal,
                      primaryAsset: editingSignal.primaryAsset,
                      secondaryAsset: editingSignal.secondaryAsset,
                      tertiaryAsset: editingSignal.tertiaryAsset,
                      executiveSummary: editingSignal.executiveSummary,
                      associatedData: editingSignal.associatedData,
                    }
                  : undefined}
                onEditComplete={() => {
                  if (onEditComplete) {
                    onEditComplete()
                  }
                }}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

