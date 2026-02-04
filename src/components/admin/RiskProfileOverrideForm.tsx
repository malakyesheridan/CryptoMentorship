'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatRiskProfileLabel } from '@/lib/riskOnboarding/labels'

const PROFILE_OPTIONS: Array<'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE'> = [
  'CONSERVATIVE',
  'SEMI',
  'AGGRESSIVE',
]

type RiskProfileOverrideFormProps = {
  userId: string
  currentOverrideProfile: 'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE' | null
  currentReason: string
}

export function RiskProfileOverrideForm({
  userId,
  currentOverrideProfile,
  currentReason,
}: RiskProfileOverrideFormProps) {
  const [profile, setProfile] = useState<'CONSERVATIVE' | 'SEMI' | 'AGGRESSIVE'>(
    currentOverrideProfile || 'CONSERVATIVE'
  )
  const [reason, setReason] = useState(currentReason)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setStatus('saving')
    setError(null)

    if (!reason.trim()) {
      setStatus('error')
      setError('Please provide a reason for the override.')
      return
    }

    const response = await fetch(`/api/admin/risk-profiles/${userId}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, reason }),
    })

    if (!response.ok) {
      setStatus('error')
      setError('Failed to save override.')
      return
    }

    setStatus('saved')
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">Override profile</label>
        <select
          value={profile}
          onChange={(event) => setProfile(event.target.value as typeof profile)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {PROFILE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatRiskProfileLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Reason</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[96px]"
          placeholder="Why is this override needed?"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === 'saved' && <p className="text-sm text-emerald-600">Override saved.</p>}

      <Button onClick={handleSubmit} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving...' : 'Save override'}
      </Button>
    </div>
  )
}

