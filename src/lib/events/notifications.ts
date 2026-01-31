import { prisma } from '@/lib/prisma'
import { resolveNotificationPreferences, shouldSendInAppNotification } from '@/lib/notification-preferences'

export type AppEvent =
  | { type: 'research_published'; contentId: string }
  | { type: 'episode_published'; episodeId: string }
  | { type: 'signal_published'; contentId: string }
  | { type: 'mention'; messageId: string; mentionedUserIds: string[] }
  | { type: 'reply'; messageId: string; parentAuthorId: string }
  | { type: 'announcement'; title: string; body?: string; url?: string }
  | { type: 'question_answered'; questionId: string; questionAuthorId: string }

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
    // Don't throw - events should be fire-and-forget
  }
}

async function handleContentPublished(type: 'research_published' | 'signal_published', contentId: string) {
  // Get the content to determine minTier and author
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { minTier: true, publishedAt: true, slug: true }
  })

  if (!content) return

  // Get eligible users based on minTier
  const eligibleUsers = await getEligibleUsersForContent(content.minTier)
  
  // Create notifications for eligible users
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
    await prisma.notification.createMany({
      data: notifications
    })
  }
}

async function handleEpisodePublished(episodeId: string) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { slug: true }
  })

  if (!episode) return

  // Get eligible users (episodes don't have minTier restrictions for now)
  const eligibleUsers = await getEligibleActiveUsers()

  // Create notifications
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
    await prisma.notification.createMany({
      data: notifications,
    })
  }
}

async function handleMention(messageId: string, mentionedUserIds: string[]) {
  if (mentionedUserIds.length === 0) return

  const preferences = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: mentionedUserIds }
    }
  })

  const preferenceMap = new Map(preferences.map(p => [p.userId, p]))

  // Create notifications
  const notifications = mentionedUserIds
    .filter(userId => {
      const prefs = resolveNotificationPreferences(preferenceMap.get(userId) ?? null)
      return shouldSendInAppNotification('mention', prefs)
    })
    .map(userId => ({
      userId,
      type: 'mention' as const,
      entityType: 'message' as const,
      entityId: messageId,
      title: 'You were mentioned',
      body: 'Someone mentioned you in a community message',
      url: `/community?message=${messageId}`,
      channel: 'inapp' as const,
    }))

  if (notifications.length > 0) {
    await prisma.notification.createMany({
      data: notifications,
    })
  }
}

async function handleReply(messageId: string, parentAuthorId: string) {
  // Get notification preferences for the parent author
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: parentAuthorId }
  })

  const resolved = resolveNotificationPreferences(preference ?? null)
  if (!shouldSendInAppNotification('reply', resolved)) return

  // Create notification
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

async function handleAnnouncement(title: string, body?: string, url?: string) {
  // Get all members, editors, and admins
  const eligibleUsers = await getEligibleActiveUsers()

  // Create notifications
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
    await prisma.notification.createMany({
      data: notifications,
    })
  }
}

async function getEligibleUsersForContent(minTier: string | null) {
  const now = new Date()
  if (!minTier) {
    // No tier restriction - all members can see
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
      select: { id: true, notificationPreference: true }
    })
  }

  // Get users with appropriate membership tier
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
    select: { id: true, notificationPreference: true }
  })
}

async function handleQuestionAnswered(questionId: string, questionAuthorId: string) {
  // Get the question and event details
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

  // Check if user wants to receive reply notifications
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: questionAuthorId },
    select: { onReply: true, inApp: true }
  })

  const resolved = resolveNotificationPreferences(preferences ?? null)
  if (!shouldSendInAppNotification('question_answered', resolved)) return

  // Check for duplicate notifications within 10 minutes
  const recentNotification = await prisma.notification.findFirst({
    where: {
      userId: questionAuthorId,
      type: 'question_answered',
      entityId: questionId,
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    }
  })

  if (recentNotification) return

  // Create notification
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
    select: { id: true, notificationPreference: true }
  })
}
