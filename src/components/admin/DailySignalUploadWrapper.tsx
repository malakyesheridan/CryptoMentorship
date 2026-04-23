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
    tier?: string // Legacy — not used; all new signals are tagged T2 server-side
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

type Category = 'majors' | 'memecoins'

const CATEGORY_LABELS: Record<Category, string> = {
  majors: 'Market Rotation',
  memecoins: 'Memecoins',
}

export default function DailySignalUploadWrapper({ userRole, editingSignal, onEditComplete }: DailySignalUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>('majors')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingSignal) {
      const category: Category = editingSignal.category === 'memecoins' ? 'memecoins' : 'majors'
      setActiveCategory(category)
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
            <h2 className="text-2xl font-bold text-[var(--text-strong)]">Daily Portfolio Updates</h2>
          </div>
          <p className="text-[var(--text-strong)]">
            Post a daily update for Market Rotation or Memecoins. All active subscribers will see it.
          </p>
        </div>

        {/* Category Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-[var(--bg-panel)] rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-[var(--border-subtle)] w-full sm:w-auto">
            {(['majors', 'memecoins'] as Category[]).map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? 'default' : 'ghost'}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'rounded-xl px-4 sm:px-6 py-3 font-medium transition-all duration-200 min-h-[44px] flex-1 sm:flex-none',
                  activeCategory === category
                    ? 'bg-yellow-500 text-white shadow-md hover:bg-gold-600'
                    : 'text-[var(--text-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-strong)]'
                )}
              >
                {CATEGORY_LABELS[category]}
              </Button>
            ))}
          </div>
        </div>

        {/* Forms — render both so form state per category persists while switching tabs */}
        {(['majors', 'memecoins'] as Category[]).map((category) => {
          const isActive = activeCategory === category
          const editingCategory: Category =
            editingSignal?.category === 'memecoins' ? 'memecoins' : 'majors'
          const shouldHydrate = !!editingSignal && editingCategory === category

          return (
            <div key={category} className={isActive ? 'block' : 'hidden'}>
              <DailySignalUpload
                category={category}
                userRole={userRole}
                formIdPrefix={category}
                existingSignal={shouldHydrate && editingSignal
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
