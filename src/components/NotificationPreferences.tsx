'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Mail, Clock } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

interface NotificationPreference {
  userId: string
  inApp: boolean
  email: boolean
  onResearch: boolean
  onEpisode: boolean
  onSignal: boolean
  onMention: boolean
  onReply: boolean
  digestEnabled: boolean
  digestFreq: 'daily' | 'weekly'
  digestHourUTC: number
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null)
  const [loading, setLoading] = useState(false)

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

    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)

    try {
      const response = await fetch('/api/me/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      mutate()
    } catch (error) {
      // Revert on error
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

  return (
    <div className="space-y-6">
      {/* Channels */}
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
              checked={preferences.inApp}
              onChange={(e) => updatePreference({ inApp: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-slate-600">
                Send notifications via email (coming soon)
              </p>
            </div>
            <Switch
              id="email"
              checked={false}
              disabled
              className="opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Types */}
      <Card>
        <CardHeader>
          <CardTitle>What to notify me about</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="onResearch" className="text-base font-medium">
                Research Published
              </Label>
              <p className="text-sm text-slate-600">
                New research articles and analysis
              </p>
            </div>
            <Switch
              id="onResearch"
              checked={preferences.onResearch}
              onChange={(e) => updatePreference({ onResearch: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="onEpisode" className="text-base font-medium">
                Macro Minute Episodes
              </Label>
              <p className="text-sm text-slate-600">
                New Macro Minute episodes
              </p>
            </div>
            <Switch
              id="onEpisode"
              checked={preferences.onEpisode}
              onChange={(e) => updatePreference({ onEpisode: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="onSignal" className="text-base font-medium">
                Trading Signals
              </Label>
              <p className="text-sm text-slate-600">
                New trading signals and recommendations
              </p>
            </div>
            <Switch
              id="onSignal"
              checked={preferences.onSignal}
              onChange={(e) => updatePreference({ onSignal: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="onMention" className="text-base font-medium">
                Mentions
              </Label>
              <p className="text-sm text-slate-600">
                When someone mentions you in community discussions
              </p>
            </div>
            <Switch
              id="onMention"
              checked={preferences.onMention}
              onChange={(e) => updatePreference({ onMention: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="onReply" className="text-base font-medium">
                Replies
              </Label>
              <p className="text-sm text-slate-600">
                When someone replies to your messages
              </p>
            </div>
            <Switch
              id="onReply"
              checked={preferences.onReply}
              onChange={(e) => updatePreference({ onReply: e.target.checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
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
