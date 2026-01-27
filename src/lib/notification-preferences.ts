export type NotificationPreferenceLike = {
  inApp: boolean
  email: boolean
  onResearch: boolean
  onEpisode: boolean
  onSignal: boolean
  onMention: boolean
  onReply: boolean
  digestEnabled: boolean
  digestFreq: 'daily' | 'weekly' | string
  digestHourUTC: number
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceLike = {
  inApp: true,
  email: true,
  onResearch: false,
  onEpisode: false,
  onSignal: true,
  onMention: false,
  onReply: false,
  digestEnabled: false,
  digestFreq: 'weekly',
  digestHourUTC: 9
}

export function resolveNotificationPreferences(
  preferences?: Partial<NotificationPreferenceLike> | null
): NotificationPreferenceLike {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(preferences ?? {})
  }
}

export function shouldSendInAppNotification(
  type: string,
  preferences?: Partial<NotificationPreferenceLike> | null
) {
  const resolved = resolveNotificationPreferences(preferences)
  if (!resolved.inApp) return false

  switch (type) {
    case 'research_published':
    case 'learning_hub':
      return resolved.onResearch
    case 'episode_published':
    case 'crypto_compass':
      return resolved.onEpisode
    case 'signal_published':
    case 'portfolio_update':
      return resolved.onSignal
    case 'mention':
    case 'community_mention':
      return resolved.onMention
    case 'reply':
    case 'community_reply':
    case 'question_answered':
      return resolved.onReply
    case 'announcement':
    default:
      return true
  }
}
