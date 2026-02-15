export const notificationEmailTypes = [
  'portfolio_update',
  'crypto_compass',
  'learning_hub',
  'community_mention',
  'community_reply',
] as const

export type NotificationEmailType = (typeof notificationEmailTypes)[number]

export type NotificationEvent = {
  type: NotificationEmailType
  subjectId: string
  actorId: string | null
  recipientUserId: string | null
  metadata: Record<string, unknown>
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
