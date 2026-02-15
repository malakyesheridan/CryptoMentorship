import { resolveNotificationPrefs } from '@/lib/notifications/preferences'

export type NotificationPreferenceLike = {
  inApp?: boolean
  email?: boolean
  onResearch?: boolean
  onEpisode?: boolean
  onSignal?: boolean
  onMention?: boolean
  onReply?: boolean
  inAppEnabled?: boolean
  emailEnabled?: boolean
  portfolioUpdatesEmail?: boolean
  cryptoCompassEmail?: boolean
  learningHubEmail?: boolean
  communityMentionsEmail?: boolean
  communityRepliesEmail?: boolean
  digestEnabled?: boolean
  digestFreq?: 'daily' | 'weekly' | string
  digestHourUTC?: number
}

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  inAppEnabled: true,
  emailEnabled: true,
  portfolioUpdatesEmail: true,
  cryptoCompassEmail: true,
  learningHubEmail: true,
  communityMentionsEmail: true,
  communityRepliesEmail: true,
  digestEnabled: false,
  digestFreq: 'weekly',
  digestHourUTC: 9,
}

export function resolveNotificationPreferences(
  preferences?: Partial<NotificationPreferenceLike> | null
) {
  const resolved = resolveNotificationPrefs(preferences)
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...resolved,
  }
}

export function shouldSendInAppNotification(
  _type: string,
  preferences?: Partial<NotificationPreferenceLike> | null
) {
  const resolved = resolveNotificationPreferences(preferences)
  return resolved.inAppEnabled
}
