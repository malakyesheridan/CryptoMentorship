'use client'

import { useState, useEffect } from 'react'
import DailySignalUpload from './DailySignalUpload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailySignalUploadWrapperProps {
  userRole?: string
}

type Tier = 'T1' | 'T2' | 'T3'

const tierLabels: Record<Tier, string> = {
  T1: 'T1 - Basic Tier',
  T2: 'T2 - Premium Tier',
  T3: 'T3 - Elite Tier',
}

type Category = 'majors' | 'memecoins'

export default function DailySignalUploadWrapper({ userRole }: DailySignalUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTier, setActiveTier] = useState<Tier>('T1')
  const [activeCategory, setActiveCategory] = useState<Category>('majors')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset category when tier changes
  useEffect(() => {
    if (activeTier !== 'T3') {
      setActiveCategory('majors')
    }
  }, [activeTier])

  if (!mounted) {
    return <div className="h-32" />
  }

  if (userRole !== 'admin' && userRole !== 'editor') {
    return null
  }

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-2xl font-bold text-slate-900">Daily Portfolio Signal Updates</h2>
          </div>
          <p className="text-slate-600">
            Create daily signals for each tier. Users will see signals for their tier and all lower tiers.
          </p>
        </div>

        {/* Tier Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200 w-full sm:w-auto">
            {(['T1', 'T2', 'T3'] as Tier[]).map((tier) => (
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

        {/* Category Tab Navigation (only for T3) */}
        {activeTier === 'T3' && (
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
                  {category === 'majors' ? 'Majors' : 'Memecoins'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Active Tab Content */}
        <DailySignalUpload 
          tier={activeTier} 
          category={activeTier === 'T3' ? activeCategory : undefined}
          userRole={userRole} 
        />
      </CardContent>
    </Card>
  )
}

