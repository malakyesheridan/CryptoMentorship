import { prisma } from '@/lib/prisma'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'
import { enqueueEmail } from '@/lib/email/outbox'
import { buildNotificationDedupeKey, type NotificationEvent } from '@/lib/notifications/types'
import { canSendEmailFromPrefs, resolveNotificationPrefs } from '@/lib/notifications/preferences'

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

async function enqueueNotificationEmail(event: NotificationEvent, recipient: {
  userId: string
  email: string | null
  name?: string | null
}, variables: Record<string, unknown>, subject: string) {
  if (!recipient.email) return

  await enqueueEmail({
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

export async function emit(event: AppEvent): Promise<void> {
  try {
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
  } catch (error) {
    console.error('Error emitting event:', error)
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

  const emailTasks = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPrefs(user.notificationPreference ?? null)
      return canSendEmailFromPrefs('crypto_compass', prefs)
    })
    .map(user => {
      const notificationEvent: NotificationEvent = {
        type: 'crypto_compass',
        subjectId: episodeId,
        actorId: null,
        recipientUserId: user.id,
        metadata: {
          title: episode.title,
          excerpt: episode.excerpt,
          url: episodeUrl,
        },
      }

      return enqueueNotificationEmail(
        notificationEvent,
        { userId: user.id, email: user.email, name: user.name },
        {
          title: episode.title,
          excerpt: episode.excerpt,
          url: episodeUrl,
        },
        'New Crypto Compass Episode'
      )
    })

  await Promise.all(emailTasks)
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

  const emailTasks = eligibleUsers
    .filter(user => {
      const prefs = resolveNotificationPrefs(user.notificationPreference ?? null)
      return canSendEmailFromPrefs('learning_hub', prefs)
    })
    .map(user => {
      const notificationEvent: NotificationEvent = {
        type: 'learning_hub',
        subjectId: event.subjectId,
        actorId: null,
        recipientUserId: user.id,
        metadata: {
          title: event.title,
          url: absoluteUrl,
          subjectType: event.subjectType,
        },
      }

      return enqueueNotificationEmail(
        notificationEvent,
        { userId: user.id, email: user.email, name: user.name },
        {
          title: `${event.title}`,
          url: absoluteUrl,
          subjectType: event.subjectType,
        },
        'Learning Hub Update'
      )
    })

  await Promise.all(emailTasks)
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

  const emailTasks = recipients
    .filter((user) => {
      const prefs = resolveNotificationPrefs(user.notificationPreference ?? null)
      return canSendEmailFromPrefs('community_mention', prefs)
    })
    .map((user) => {
      const notificationEvent: NotificationEvent = {
        type: 'community_mention',
        subjectId: messageId,
        actorId: message.userId,
        recipientUserId: user.id,
        metadata: {
          actorName,
          snippet,
          url: messageUrl,
        },
      }

      return enqueueNotificationEmail(
        notificationEvent,
        { userId: user.id, email: user.email, name: user.name },
        {
          actorName,
          snippet,
          url: messageUrl,
        },
        'You were mentioned in the community'
      )
    })

  await Promise.all(emailTasks)
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

  const emailPrefs = resolveNotificationPrefs(recipient.notificationPreference ?? null)
  if (!canSendEmailFromPrefs('community_reply', emailPrefs)) return

  const actorName = replyMessage.user.name || 'Someone'
  const snippet = replyMessage.body.length > 180 ? `${replyMessage.body.slice(0, 177)}...` : replyMessage.body
  const messageUrl = `${getBaseUrl()}/community?message=${messageId}`

  const notificationEvent: NotificationEvent = {
    type: 'community_reply',
    subjectId: messageId,
    actorId: replyMessage.userId,
    recipientUserId: recipient.id,
    metadata: {
      actorName,
      snippet,
      url: messageUrl,
    },
  }

  await enqueueNotificationEmail(
    notificationEvent,
    { userId: recipient.id, email: recipient.email, name: recipient.name },
    {
      actorName,
      snippet,
      url: messageUrl,
    },
    'New reply to your community message'
  )
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
