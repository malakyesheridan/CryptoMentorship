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
  // per-type email
  portfolioUpdatesEmail: boolean
  cryptoCompassEmail: boolean
  learningHubEmail: boolean
  communityMentionsEmail: boolean
  communityRepliesEmail: boolean
  // per-type in-app
  portfolioUpdatesInApp: boolean
  cryptoCompassInApp: boolean
  learningHubInApp: boolean
  communityMentionsInApp: boolean
  communityRepliesInApp: boolean
  announcementsInApp: boolean
  eventRemindersInApp: boolean
  // digest
  digestEnabled: boolean
  digestFreq: 'daily' | 'weekly'
  digestHourUTC: number
}

type NotificationTypeRow = {
  label: string
  description: string
  inAppKey?: keyof NotificationPreference
  emailKey?: keyof NotificationPreference
}

const NOTIFICATION_TYPES: NotificationTypeRow[] = [
  {
    label: 'Portfolio Updates',
    description: 'Daily portfolio updates and signals',
    inAppKey: 'portfolioUpdatesInApp',
    emailKey: 'portfolioUpdatesEmail',
  },
  {
    label: 'Crypto Compass',
    description: 'New episodes and weekly updates',
    inAppKey: 'cryptoCompassInApp',
    emailKey: 'cryptoCompassEmail',
  },
  {
    label: 'Learning Hub',
    description: 'New tracks, lessons, and resources',
    inAppKey: 'learningHubInApp',
    emailKey: 'learningHubEmail',
  },
  {
    label: 'Community Mentions',
    description: 'When someone mentions you in community',
    inAppKey: 'communityMentionsInApp',
    emailKey: 'communityMentionsEmail',
  },
  {
    label: 'Community Replies',
    description: 'When someone replies to your messages',
    inAppKey: 'communityRepliesInApp',
    emailKey: 'communityRepliesEmail',
  },
  {
    label: 'Announcements',
    description: 'Team announcements and updates',
    inAppKey: 'announcementsInApp',
  },
  {
    label: 'Event Reminders',
    description: 'Reminders before events you RSVP to',
    inAppKey: 'eventRemindersInApp',
  },
]

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
          <p className="text-[#c03030]">Failed to load notification preferences</p>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#2a2520] rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-[#2a2520] rounded w-3/4"></div>
              <div className="h-4 bg-[#2a2520] rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const inAppDisabled = !preferences.inAppEnabled
  const emailDisabled = !preferences.emailEnabled

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
              <p className="text-sm text-[var(--text-strong)]">
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
              <p className="text-sm text-[var(--text-strong)]">
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
        <CardContent className="space-y-1">
          {/* Column headers */}
          <div className="flex items-center justify-end gap-6 pb-2 border-b border-[var(--border-subtle)] mb-3">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-12 text-center">In-App</span>
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-12 text-center">Email</span>
          </div>

          {NOTIFICATION_TYPES.map((row) => {
            const hasInApp = !!row.inAppKey
            const hasEmail = !!row.emailKey

            return (
              <div
                key={row.label}
                className="flex items-center justify-between py-3"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <Label className="text-base font-medium">{row.label}</Label>
                  <p className="text-sm text-[var(--text-strong)]">{row.description}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  {/* In-App toggle */}
                  <div className={`w-12 flex justify-center ${hasInApp && inAppDisabled ? 'opacity-60' : ''}`}>
                    {hasInApp ? (
                      <Switch
                        checked={preferences[row.inAppKey!] as boolean}
                        disabled={inAppDisabled}
                        onChange={(event) =>
                          updatePreference({ [row.inAppKey!]: event.target.checked })
                        }
                      />
                    ) : (
                      <span className="text-[var(--text-muted)]">&mdash;</span>
                    )}
                  </div>
                  {/* Email toggle */}
                  <div className={`w-12 flex justify-center ${hasEmail && emailDisabled ? 'opacity-60' : ''}`}>
                    {hasEmail ? (
                      <Switch
                        checked={preferences[row.emailKey!] as boolean}
                        disabled={emailDisabled}
                        onChange={(event) =>
                          updatePreference({ [row.emailKey!]: event.target.checked })
                        }
                      />
                    ) : (
                      <span className="text-[var(--text-muted)]">&mdash;</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
              <p className="text-sm text-[var(--text-strong)]">
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

          <div className="text-sm text-[var(--text-muted)] bg-[#1a1815] p-3 rounded-lg">
            <strong>Coming Soon:</strong> Email digest notifications will be available in a future update.
            You&apos;ll be able to receive daily or weekly summaries of new content and mentions.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
