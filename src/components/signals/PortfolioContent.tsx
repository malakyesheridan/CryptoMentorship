'use client'

import { Suspense, useState } from 'react'
import DailySignalDisplay from './DailySignalDisplay'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { canViewContent } from '@/lib/content-utils'
import Link from 'next/link'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2' | 'T3'
  category?: 'majors' | 'memecoins' | null
  signal: string
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: string
}


interface PortfolioContentProps {
  // Data
  metrics: any
  openPositions: any[]
  closedTrades: any[]
  signals: any[]
  
  // User info
  userRole: string
  userTier: string | null
}

// Separate component for signals by tier to avoid hydration issues
function SignalsByTier({ 
  signals, 
  userRole, 
  userTier 
}: { 
  signals: any[]
  userRole: string
  userTier: string | null
}) {
  // Filter signals by user tier and group by tier
  const filteredSignals = signals.filter((signal: any) => {
    return canViewContent(userRole, userTier, signal.minTier || null, signal.locked || false)
  })
  
  // Group signals by tier
  const signalsByTier = {
    all: filteredSignals.filter((s: any) => !s.minTier),
    T1: filteredSignals.filter((s: any) => s.minTier === 'T1'),
    T2: filteredSignals.filter((s: any) => s.minTier === 'T2'),
    T3: filteredSignals.filter((s: any) => s.minTier === 'T3'),
  }
  
  const tierLabels: Record<string, string> = {
    all: 'All Members',
    T1: 'T1 - Basic Tier',
    T2: 'T2 - Premium Tier',
    T3: 'T3 - Elite Tier',
  }
  
  const tiersWithSignals = Object.entries(signalsByTier).filter(([_, tierSignals]) => tierSignals.length > 0)
  
  if (tiersWithSignals.length === 0) {
    return null
  }
  
  return (
    <div className="space-y-8 mt-8">
      {tiersWithSignals.map(([tier, tierSignals]: [string, any[]]) => (
        <Card key={tier}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
              {tierLabels[tier]} Portfolio Recommendations
            </CardTitle>
            <CardDescription>
              Explore available portfolio signals and recommendations for {tierLabels[tier].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tierSignals.slice(0, 6).map((signal: any) => (
                <Link key={signal.id} href={`/content/${signal.slug || signal.id}`}>
                  <Card className="hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                    {signal.coverUrl && (
                      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={signal.coverUrl}
                          alt={signal.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        {signal.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {signal.excerpt || 'No description available.'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PortfolioContent({
  metrics,
  openPositions,
  closedTrades,
  signals,
  userRole,
  userTier
}: PortfolioContentProps) {
  return (
    <div className="space-y-8">
      {/* Daily Signal Updates - Now handled by DailySignalManager */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Today&apos;s Portfolio Signal Updates</h2>
      </div>


      {/* Signals Grid (visible if no positions) */}
      {openPositions.length === 0 && signals.length > 0 && (
        <SignalsByTier 
          signals={signals} 
          userRole={userRole} 
          userTier={userTier} 
        />
      )}
    </div>
  )
}

