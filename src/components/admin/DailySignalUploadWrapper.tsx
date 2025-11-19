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

export default function DailySignalUploadWrapper({ userRole }: DailySignalUploadWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTier, setActiveTier] = useState<Tier>('T1')

  useEffect(() => {
    setMounted(true)
  }, [])

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

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-wrap gap-2 border border-slate-200">
            {(['T1', 'T2', 'T3'] as Tier[]).map((tier) => (
              <Button
                key={tier}
                variant={activeTier === tier ? 'default' : 'ghost'}
                onClick={() => setActiveTier(tier)}
                className={cn(
                  'rounded-xl px-6 py-3 font-medium transition-all duration-200',
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

        {/* Active Tab Content */}
        <DailySignalUpload tier={activeTier} userRole={userRole} />
      </CardContent>
    </Card>
  )
}

