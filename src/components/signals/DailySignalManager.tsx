'use client'

import { useState } from 'react'
import DailySignalDisplay from './DailySignalDisplay'
import AdminSignalUploadWrapper from '@/components/AdminSignalUploadWrapper'

interface DailySignal {
  id: string
  tier: string
  category?: 'majors' | 'memecoins' | null
  signal: string
  primaryAsset?: string | null
  secondaryAsset?: string | null
  tertiaryAsset?: string | null
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: string
}

interface DailySignalManagerProps {
  userRole?: string
}

export default function DailySignalManager({ userRole }: DailySignalManagerProps) {
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
          userRole={userRole}
          onEditSignal={(signal) => setEditingSignal(signal)}
        />
      </div>
    </div>
  )
}
