'use client'

import { useState } from 'react'
import DailySignalDisplay from './DailySignalDisplay'
import AdminSignalUploadWrapper from '@/components/AdminSignalUploadWrapper'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2' | 'T3'
  category?: 'majors' | 'memecoins' | null
  signal: string
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: string
}

interface DailySignalManagerProps {
  userTier: string | null
  userRole?: string
}

export default function DailySignalManager({ userTier, userRole }: DailySignalManagerProps) {
  const [editingSignal, setEditingSignal] = useState<DailySignal | null>(null)

  return (
    <div className="space-y-8">
      {/* Admin Upload Section */}
      <AdminSignalUploadWrapper 
        userRole={userRole}
        editingSignal={editingSignal}
        onEditComplete={() => setEditingSignal(null)}
      />
      
      {/* Daily Update Display */}
      <div className="space-y-6">
        <DailySignalDisplay 
          userTier={userTier} 
          userRole={userRole}
          onEditSignal={(signal) => setEditingSignal(signal)}
        />
      </div>
    </div>
  )
}

