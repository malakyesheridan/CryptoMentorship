export const notificationEmailTypes = [
  'portfolio_update',
  'crypto_compass',
  'learning_hub',
  'community_mention',
  'community_reply',
] as const

export type NotificationEmailType = (typeof notificationEmailTypes)[number]

export const notificationInAppTypes = [
  'portfolio_update',
  'crypto_compass',
  'learning_hub',
  'community_mention',
  'community_reply',
  'announcement',
  'event_reminder',
] as const

export type NotificationInAppType = (typeof notificationInAppTypes)[number]

export type NotificationEvent = {
  type: NotificationEmailType
  subjectId: string
  actorId: string | null
  recipientUserId: string | null
  metadata: Record<string, unknown>
}

/**
 * Maps event type strings (used in notification handlers) to canonical
 * notification type strings (used in preference lookups).
 */
export function mapEventTypeToNotificationType(eventType: string): NotificationInAppType | null {
  switch (eventType) {
    case 'episode_published':
      return 'crypto_compass'
    case 'research_published':
    case 'learning_hub':
      return 'learning_hub'
    case 'signal_published':
    case 'portfolio_update':
      return 'portfolio_update'
    case 'mention':
    case 'community_mention':
      return 'community_mention'
    case 'reply':
    case 'community_reply':
      return 'community_reply'
    case 'announcement':
      return 'announcement'
    case 'event_reminder':
      return 'event_reminder'
    case 'question_answered':
      return 'community_reply'
    default:
      return null
  }
}

export function buildNotificationDedupeKey(event: NotificationEvent, recipientUserId: string): string {
  switch (event.type) {
    case 'portfolio_update':
      return `portfolio_update:${event.subjectId}:user:${recipientUserId}`
    case 'crypto_compass':
      return `crypto_compass:${event.subjectId}:user:${recipientUserId}`
    case 'learning_hub':
      return `learning_hub:${event.subjectId}:user:${recipientUserId}`
    case 'community_mention':
      return `community_mention:${event.subjectId}:user:${recipientUserId}`
    case 'community_reply':
      return `community_reply:${event.subjectId}:user:${recipientUserId}`
    default:
      return `notification:${event.type}:${event.subjectId}:user:${recipientUserId}`
  }
}
