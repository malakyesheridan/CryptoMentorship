'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, Clock } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

interface NotificationPreference {
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  portfolioUpdatesEmail: boolean
  cryptoCompassEmail: boolean
  learningHubEmail: boolean
  communityMentionsEmail: boolean
  communityRepliesEmail: boolean
  digestEnabled: boolean
  digestFreq: 'daily' | 'weekly'
  digestHourUTC: number
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)

  const { data, error, mutate } = useSWR(
    '/api/me/notification-preferences',
    (url) => fetch(url).then(res => res.json())
  )

  useEffect(() => {
    if (data) {
      setPreferences(data)
    }
  }, [data])

  const updatePreference = async (updates: Partial<NotificationPreference>) => {
    if (!preferences) return

    const nextPreferences = { ...preferences, ...updates }
    setPreferences(nextPreferences)

    try {
      const response = await fetch('/api/me/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPreferences)
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      const updated = await response.json()
      setPreferences(updated)
      await mutate(updated, { revalidate: false })
      toast.success('Saved')
    } catch (_error) {
      setPreferences(preferences)
      toast.error('Failed to update notification preferences')
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load notification preferences</p>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const emailTypesDisabled = !preferences.emailEnabled

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="inApp" className="text-base font-medium">
                In-App Notifications
              </Label>
              <p className="text-sm text-slate-600">
                Show notifications in the app and browser
              </p>
            </div>
            <Switch
              id="inApp"
              checked={preferences.inAppEnabled}
              onChange={(event) => updatePreference({ inAppEnabled: event.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-slate-600">
                Receive notification emails
              </p>
            </div>
            <Switch
              id="email"
              checked={preferences.emailEnabled}
              onChange={(event) => updatePreference({ emailEnabled: event.target.checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between ${emailTypesDisabled ? 'opacity-60' : ''}`}>
            <div>
              <Label htmlFor="onPortfolio" className="text-base font-medium">
                Portfolio Updates
              </Label>
              <p className="text-sm text-slate-600">
                Daily portfolio updates and signals
              </p>
            </div>
            <Switch
              id="onPortfolio"
              checked={preferences.portfolioUpdatesEmail}
              disabled={emailTypesDisabled}
              onChange={(event) => updatePreference({ portfolioUpdatesEmail: event.target.checked })}
            />
          </div>

          <div className={`flex items-center justify-between ${emailTypesDisabled ? 'opacity-60' : ''}`}>
            <div>
              <Label htmlFor="onCryptoCompass" className="text-base font-medium">
                Crypto Compass
              </Label>
              <p className="text-sm text-slate-600">
                New episodes and weekly updates
              </p>
            </div>
            <Switch
              id="onCryptoCompass"
              checked={preferences.cryptoCompassEmail}
              disabled={emailTypesDisabled}
              onChange={(event) => updatePreference({ cryptoCompassEmail: event.target.checked })}
            />
          </div>

          <div className={`flex items-center justify-between ${emailTypesDisabled ? 'opacity-60' : ''}`}>
            <div>
              <Label htmlFor="onLearning" className="text-base font-medium">
                Learning Hub
              </Label>
              <p className="text-sm text-slate-600">
                New tracks, lessons, and resources
              </p>
            </div>
            <Switch
              id="onLearning"
              checked={preferences.learningHubEmail}
              disabled={emailTypesDisabled}
              onChange={(event) => updatePreference({ learningHubEmail: event.target.checked })}
            />
          </div>

          <div className={`flex items-center justify-between ${emailTypesDisabled ? 'opacity-60' : ''}`}>
            <div>
              <Label htmlFor="onMention" className="text-base font-medium">
                Community Mentions
              </Label>
              <p className="text-sm text-slate-600">
                When someone mentions you in community
              </p>
            </div>
            <Switch
              id="onMention"
              checked={preferences.communityMentionsEmail}
              disabled={emailTypesDisabled}
              onChange={(event) => updatePreference({ communityMentionsEmail: event.target.checked })}
            />
          </div>

          <div className={`flex items-center justify-between ${emailTypesDisabled ? 'opacity-60' : ''}`}>
            <div>
              <Label htmlFor="onReply" className="text-base font-medium">
                Community Replies
              </Label>
              <p className="text-sm text-slate-600">
                When someone replies to your messages
              </p>
            </div>
            <Switch
              id="onReply"
              checked={preferences.communityRepliesEmail}
              disabled={emailTypesDisabled}
              onChange={(event) => updatePreference({ communityRepliesEmail: event.target.checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Digest Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="digestEnabled" className="text-base font-medium">
                Email Digest
              </Label>
              <p className="text-sm text-slate-600">
                Receive a summary of activity via email (coming soon)
              </p>
            </div>
            <Switch
              id="digestEnabled"
              checked={false}
              disabled
              className="opacity-50"
            />
          </div>

          <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            <strong>Coming Soon:</strong> Email digest notifications will be available in a future update.
            You&apos;ll be able to receive daily or weekly summaries of new content and mentions.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
