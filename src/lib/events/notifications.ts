import { prisma } from '@/lib/prisma'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'
import { enqueueEmail } from '@/lib/email/outbox'
import { buildNotificationDedupeKey, type NotificationEvent } from '@/lib/notifications/types'
import { resolveEmailRecipientsForEvent } from '@/lib/notifications/preferences'
import { logger } from '@/lib/logger'

export type AppEvent =
  | { type: 'research_published'; contentId: string }
  | { type: 'episode_published'; episodeId: string }
  | { type: 'signal_published'; contentId: string }
  | {
      type: 'learning_hub_published'
      subjectType: 'track' | 'lesson' | 'resource'
      subjectId: string
      title: string
      url: string
      minTier?: 'T1' | 'T2' | null
    }
  | { type: 'mention'; messageId: string; mentionedUserIds: string[] }
  | { type: 'reply'; messageId: string; parentAuthorId: string }
  | { type: 'announcement'; title: string; body?: string; url?: string }
  | { type: 'question_answered'; questionId: string; questionAuthorId: string }

function getBaseUrl() {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  return baseUrl.replace(/\/$/, '')
}

function resolveNotificationEventCronUrl(): string | null {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL || ''
  if (!baseUrl) return null
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  return new URL('/api/cron/notification-events', baseUrl.replace(/\/$/, '')).toString()
}

async function enqueueNotificationEmail(event: NotificationEvent, recipient: {
  userId: string
  email: string | null
  name?: string | null
}, variables: Record<string, unknown>, subject: string) {
  if (!recipient.email) return { queued: false, reason: 'skipped_no_email' as const }

  return enqueueEmail({
    to: recipient.email,
    userId: recipient.userId,
    templateKey: event.type,
    subject,
    variables: {
      ...variables,
      preferencesUrl: `${getBaseUrl()}/account`,
    },
    dedupeKey: buildNotificationDedupeKey(event, recipient.userId),
  })
}

type NotificationEnqueueOutcome = {
  queued: boolean
  reason?: 'duplicate' | 'error' | 'skipped_no_email'
}

function logNotificationEmailSummary(
  type: NotificationEvent['type'],
  subjectId: string,
  outcomes: NotificationEnqueueOutcome[],
  context: Record<string, unknown> = {}
) {
  const queuedCount = outcomes.filter((result) => result.queued).length
  const duplicateCount = outcomes.filter((result) => result.reason === 'duplicate').length
  const failedCount = outcomes.filter((result) => result.reason === 'error').length
  const skippedNoEmailCount = outcomes.filter((result) => result.reason === 'skipped_no_email').length

  logger.info('Notification emails enqueued via outbox', {
    notificationType: type,
    subjectId,
    recipients: outcomes.length,
    queuedCount,
    duplicateCount,
    failedCount,
    skippedNoEmailCount,
    ...context,
  })
}

export async function emitStrict(event: AppEvent): Promise<void> {
  switch (event.type) {
    case 'research_published':
    case 'signal_published':
      await handleContentPublished(event.type, event.contentId)
      break
    case 'episode_published':
      await handleEpisodePublished(event.episodeId)
      break
    case 'learning_hub_published':
      await handleLearningHubPublished(event)
      break
    case 'mention':
      await handleMention(event.messageId, event.mentionedUserIds)
      break
    case 'reply':
      await handleReply(event.messageId, event.parentAuthorId)
      break
    case 'announcement':
      await handleAnnouncement(event.title, event.body, event.url)
      break
    case 'question_answered':
      await handleQuestionAnswered(event.questionId, event.questionAuthorId)
      break
  }
}

export async function emit(event: AppEvent): Promise<void> {
  const cronUrl = resolveNotificationEventCronUrl()
  if (cronUrl) {
    const internalDispatchSecret = process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (internalDispatchSecret) {
      headers['x-internal-job-token'] = internalDispatchSecret
    }
    const cronSecret = process.env.VERCEL_CRON_SECRET
    const url = new URL(cronUrl)
    if (cronSecret) {
      url.searchParams.set('secret', cronSecret)
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        keepalive: true,
        headers,
        body: JSON.stringify(event),
      })
      if (response.ok) {
        return
      }
      logger.warn('Notification event cron dispatch returned non-success response; falling back to direct emit', {
        eventType: event.type,
        status: response.status,
      })
    } catch (error) {
      logger.warn('Notification event cron dispatch failed; falling back to direct emit', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  try {
    await emitStrict(event)
  } catch (error) {
    logger.error(
      'Error emitting event',
      error instanceof Error ? error : new Error(String(error)),
      { eventType: event.type }
    )
  }
}

async function handleContentPublished(type: 'research_published' | 'signal_published', contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { minTier: true, slug: true }
  })

  if (!content) return

  const eligibleUsers = await getEligibleUsersForContent(content.minTier)

  const notifications = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPreferences(user.notificationPreference ?? null)
      return shouldSendInAppNotification(type, prefs)
    })
    .map(user => ({
      userId: user.id,
      type,
      entityType: 'content' as const,
      entityId: contentId,
      title: type === 'research_published' ? 'New Research Published' : 'New Signal Published',
      body: `A new ${type === 'research_published' ? 'research' : 'signal'} has been published`,
      url: `/content/${content.slug}`,
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

async function handleEpisodePublished(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { slug: true, title: true, excerpt: true }
  })

  if (!episode) return

  const eligibleUsers = await getEligibleActiveUsers()

  const notifications = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPreferences(user.notificationPreference ?? null)
      return shouldSendInAppNotification('episode_published', prefs)
    })
    .map(user => ({
      userId: user.id,
      type: 'episode_published' as const,
      entityType: 'episode' as const,
      entityId: episodeId,
      title: 'New Crypto Compass Episode',
      body: 'A new Crypto Compass episode has been published',
      url: `/crypto-compass/${episode.slug}`,
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  const episodeUrl = `${getBaseUrl()}/crypto-compass/${episode.slug}`
  const emailRecipients = await resolveEmailRecipientsForEvent({ type: 'crypto_compass' })
  const emailTasks = emailRecipients.map((recipient) => {
    const notificationEvent: NotificationEvent = {
      type: 'crypto_compass',
      subjectId: episodeId,
      actorId: null,
      recipientUserId: recipient.userId,
      metadata: {
        title: episode.title,
        excerpt: episode.excerpt,
        url: episodeUrl,
      },
    }

    return enqueueNotificationEmail(
      notificationEvent,
      { userId: recipient.userId, email: recipient.email, name: recipient.name },
      {
        title: episode.title,
        excerpt: episode.excerpt,
        url: episodeUrl,
      },
      'New Crypto Compass Episode'
    )
  })

  const emailResults = await Promise.all(emailTasks)
  logNotificationEmailSummary('crypto_compass', episodeId, emailResults, {
    recipientsAfterPreferenceGate: emailRecipients.length,
  })
}

async function handleLearningHubPublished(event: Extract<AppEvent, { type: 'learning_hub_published' }>) {
  const eligibleUsers = await getEligibleUsersForContent(event.minTier ?? null)

  const notifications = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPreferences(user.notificationPreference ?? null)
      return shouldSendInAppNotification('learning_hub', prefs)
    })
    .map(user => ({
      userId: user.id,
      type: 'learning_hub' as const,
      entityType: event.subjectType,
      entityId: event.subjectId,
      title: `Learning Hub: ${event.title}`,
      body: 'New learning content is available.',
      url: event.url,
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  const absoluteUrl = event.url.startsWith('http') ? event.url : `${getBaseUrl()}${event.url}`
  const emailRecipients = await resolveEmailRecipientsForEvent({
    type: 'learning_hub',
    minTier: event.minTier ?? null,
  })
  const emailTasks = emailRecipients.map((recipient) => {
    const notificationEvent: NotificationEvent = {
      type: 'learning_hub',
      subjectId: event.subjectId,
      actorId: null,
      recipientUserId: recipient.userId,
      metadata: {
        title: event.title,
        url: absoluteUrl,
        subjectType: event.subjectType,
      },
    }

    return enqueueNotificationEmail(
      notificationEvent,
      { userId: recipient.userId, email: recipient.email, name: recipient.name },
      {
        title: `${event.title}`,
        url: absoluteUrl,
        subjectType: event.subjectType,
      },
      'Learning Hub Update'
    )
  })

  const emailResults = await Promise.all(emailTasks)
  logNotificationEmailSummary('learning_hub', event.subjectId, emailResults, {
    recipientsAfterPreferenceGate: emailRecipients.length,
    subjectType: event.subjectType,
  })
}

async function handleMention(messageId: string, mentionedUserIds: string[]) {
  const uniqueMentioned = Array.from(new Set(mentionedUserIds))
  if (uniqueMentioned.length === 0) return

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      body: true,
      userId: true,
      user: { select: { name: true } },
    },
  })

  if (!message) return

  const recipients = await prisma.user.findMany({
    where: {
      id: { in: uniqueMentioned.filter((userId) => userId !== message.userId) },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreference: true,
    },
  })

  const notifications = recipients
    .filter((user) => {
      const prefs = resolveNotificationPreferences(user.notificationPreference ?? null)
      return shouldSendInAppNotification('mention', prefs)
    })
    .map((user) => ({
      userId: user.id,
      type: 'mention' as const,
      entityType: 'message' as const,
      entityId: messageId,
      title: 'You were mentioned',
      body: 'Someone mentioned you in a community message',
      url: `/community?message=${messageId}`,
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }

  const actorName = message.user.name || 'Someone'
  const snippet = message.body.length > 180 ? `${message.body.slice(0, 177)}...` : message.body
  const messageUrl = `${getBaseUrl()}/community?message=${messageId}`

  const resolvedEmailRecipients = await Promise.all(
    recipients.map((recipient) =>
      resolveEmailRecipientsForEvent({
        type: 'community_mention',
        recipientUserId: recipient.id,
      })
    )
  )
  const emailRecipients = Array.from(
    new Map(
      resolvedEmailRecipients
        .flat()
        .map((recipient) => [recipient.userId, recipient] as const)
    ).values()
  )

  const emailTasks = emailRecipients.map((recipient) => {
    const notificationEvent: NotificationEvent = {
      type: 'community_mention',
      subjectId: messageId,
      actorId: message.userId,
      recipientUserId: recipient.userId,
      metadata: {
        actorName,
        snippet,
        url: messageUrl,
      },
    }

    return enqueueNotificationEmail(
      notificationEvent,
      { userId: recipient.userId, email: recipient.email, name: recipient.name },
      {
        actorName,
        snippet,
        url: messageUrl,
      },
      'You were mentioned in the community'
    )
  })

  const emailResults = await Promise.all(emailTasks)
  logNotificationEmailSummary('community_mention', messageId, emailResults, {
    recipientsAfterPreferenceGate: emailRecipients.length,
  })
}

async function handleReply(messageId: string, parentAuthorId: string) {
  const replyMessage = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      userId: true,
      body: true,
      user: { select: { name: true } },
    },
  })

  if (!replyMessage) return
  if (replyMessage.userId === parentAuthorId) return

  const recipient = await prisma.user.findUnique({
    where: { id: parentAuthorId },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreference: true,
    },
  })

  if (!recipient) return

  const resolved = resolveNotificationPreferences(recipient.notificationPreference ?? null)
  if (shouldSendInAppNotification('reply', resolved)) {
    await prisma.notification.create({
      data: {
        userId: parentAuthorId,
        type: 'reply',
        entityType: 'message',
        entityId: messageId,
        title: 'New reply to your message',
        body: 'Someone replied to your community message',
        url: `/community?message=${messageId}`,
        channel: 'inapp',
      }
    })
  }

  const emailRecipients = await resolveEmailRecipientsForEvent({
    type: 'community_reply',
    recipientUserId: recipient.id,
  })
  if (emailRecipients.length === 0) return

  const actorName = replyMessage.user.name || 'Someone'
  const snippet = replyMessage.body.length > 180 ? `${replyMessage.body.slice(0, 177)}...` : replyMessage.body
  const messageUrl = `${getBaseUrl()}/community?message=${messageId}`
  const emailRecipient = emailRecipients[0]

  const notificationEvent: NotificationEvent = {
    type: 'community_reply',
    subjectId: messageId,
    actorId: replyMessage.userId,
    recipientUserId: emailRecipient.userId,
    metadata: {
      actorName,
      snippet,
      url: messageUrl,
    },
  }

  const enqueueResult = await enqueueNotificationEmail(
    notificationEvent,
    {
      userId: emailRecipient.userId,
      email: emailRecipient.email,
      name: emailRecipient.name,
    },
    {
      actorName,
      snippet,
      url: messageUrl,
    },
    'New reply to your community message'
  )

  logNotificationEmailSummary('community_reply', messageId, [enqueueResult], {
    recipientsAfterPreferenceGate: emailRecipients.length,
  })
}

async function handleAnnouncement(title: string, body?: string, url?: string) {
  const eligibleUsers = await getEligibleActiveUsers()

  const notifications = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPreferences(user.notificationPreference ?? null)
      return shouldSendInAppNotification('announcement', prefs)
    })
    .map(user => ({
      userId: user.id,
      type: 'announcement' as const,
      title: `Announcement: ${title}`,
      body: body || 'New announcement from the team',
      url: url || '/notifications',
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications })
  }
}

async function getEligibleUsersForContent(minTier: string | null) {
  const now = new Date()
  if (!minTier) {
    return await prisma.user.findMany({
      where: {
        role: { in: ['member', 'editor', 'admin'] },
        memberships: {
          some: {
            OR: [
              {
                status: 'active',
                OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }]
              },
              {
                status: 'trial',
                currentPeriodEnd: { gte: now }
              }
            ]
          }
        }
      },
      select: { id: true, email: true, name: true, notificationPreference: true }
    })
  }

  return await prisma.user.findMany({
    where: {
      role: { in: ['member', 'editor', 'admin'] },
      memberships: {
        some: {
          tier: { gte: minTier },
          OR: [
            {
              status: 'active',
              OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }]
            },
            {
              status: 'trial',
              currentPeriodEnd: { gte: now }
            }
          ]
        }
      }
    },
    select: { id: true, email: true, name: true, notificationPreference: true }
  })
}

async function handleQuestionAnswered(questionId: string, questionAuthorId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true
        }
      }
    }
  })

  if (!question) return

  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: questionAuthorId },
    select: { onReply: true, inApp: true, inAppEnabled: true }
  })

  const resolved = resolveNotificationPreferences(preferences ?? null)
  if (!shouldSendInAppNotification('question_answered', resolved)) return

  const recentNotification = await prisma.notification.findFirst({
    where: {
      userId: questionAuthorId,
      type: 'question_answered',
      entityId: questionId,
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000)
      }
    }
  })

  if (recentNotification) return

  await prisma.notification.create({
    data: {
      userId: questionAuthorId,
      type: 'question_answered',
      entityType: 'question',
      entityId: questionId,
      title: 'Your question was answered',
      body: `Your question about "${question.event.title}" has been answered.`,
      url: `/events/${question.event.slug}`,
      channel: 'inapp'
    }
  })
}

async function getEligibleActiveUsers() {
  const now = new Date()
  return await prisma.user.findMany({
    where: {
      role: { in: ['member', 'editor', 'admin'] },
      memberships: {
        some: {
          OR: [
            {
              status: 'active',
              OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }]
            },
            {
              status: 'trial',
              currentPeriodEnd: { gte: now }
            }
          ]
        }
      }
    },
    select: { id: true, email: true, name: true, notificationPreference: true }
  })
}
