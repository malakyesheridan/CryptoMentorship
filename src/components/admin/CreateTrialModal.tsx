'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/dates'

interface CreateTrialModalProps {
  userId: string
  userName: string
  userEmail: string
  currentMembership?: {
    tier: string
    status: string
    currentPeriodEnd: string | null
  } | null
  onSuccess?: () => void
  onClose: () => void
}

export function CreateTrialModal({ userId, userName, userEmail, currentMembership, onSuccess, onClose }: CreateTrialModalProps) {
  const [tier, setTier] = useState<'T1' | 'T2'>('T2') // Default to T2 (Elite) for all trial accounts
  const [durationDays, setDurationDays] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  
  // Set tier from existing membership if available
  useEffect(() => {
    if (currentMembership?.tier && (currentMembership.tier === 'T1' || currentMembership.tier === 'T2')) {
      setTier(currentMembership.tier as 'T1' | 'T2')
    }
  }, [currentMembership])
  
  // Check if we're extending an existing trial
  const isExtending = currentMembership?.currentPeriodEnd && new Date(currentMembership.currentPeriodEnd) > new Date()
  const currentEndDate = currentMembership?.currentPeriodEnd ? new Date(currentMembership.currentPeriodEnd) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/admin/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier, durationDays }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create trial')
      }

      const action = isExtending ? 'extended' : 'created'
      toast.success(`Trial subscription ${action} for ${userName || userEmail}`)
      onSuccess?.()
      // Small delay to ensure data is saved before closing
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create trial')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>{isExtending ? 'Extend Trial Subscription' : 'Create Trial Subscription'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>User</Label>
              <Input value={userName || userEmail} disabled className="mt-1" />
            </div>
            
            {isExtending && currentEndDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">Current Trial End Date</p>
                <p className="text-sm text-blue-700 mt-1">
                  {formatDate(currentEndDate, 'MMM d, yyyy h:mm a')}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Adding {durationDays} days will extend the trial to {formatDate(new Date(currentEndDate.getTime() + durationDays * 24 * 60 * 60 * 1000), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as 'T1' | 'T2')}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="T1">Growth</option>
                <option value="T2">Elite</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="duration">{isExtending ? 'Additional Days to Add' : 'Trial Duration (days)'}</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                className="mt-1"
              />
              <p className="text-sm text-slate-500 mt-1">
                {isExtending 
                  ? `Add ${durationDays} day${durationDays !== 1 ? 's' : ''} to the current trial`
                  : 'Default: 30 days (1 month)'}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto min-h-[44px]">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto min-h-[44px]">
                {isLoading 
                  ? (isExtending ? 'Extending...' : 'Creating...') 
                  : (isExtending ? 'Extend Trial' : 'Create Trial')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

