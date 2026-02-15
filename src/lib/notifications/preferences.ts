import { prisma } from '@/lib/prisma'
import type { NotificationPreference, Prisma } from '@prisma/client'
import type { NotificationEmailType } from './types'

type MembershipTier = 'T1' | 'T2'

export type ResolvedNotificationPreferences = {
  inAppEnabled: boolean
  emailEnabled: boolean
  portfolioUpdatesEmail: boolean
  cryptoCompassEmail: boolean
  learningHubEmail: boolean
  communityMentionsEmail: boolean
  communityRepliesEmail: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: ResolvedNotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  portfolioUpdatesEmail: true,
  cryptoCompassEmail: true,
  learningHubEmail: true,
  communityMentionsEmail: true,
  communityRepliesEmail: true,
}

export type ResolvedEmailRecipient = {
  userId: string
  email: string
  name: string | null
  tier: MembershipTier
  preferences: ResolvedNotificationPreferences
}

export type NotificationRecipientEvent =
  | { type: 'portfolio_update'; requiredTier: MembershipTier }
  | { type: 'crypto_compass'; minTier?: MembershipTier | null }
  | { type: 'learning_hub'; minTier?: MembershipTier | null }
  | { type: 'community_mention'; recipientUserId: string }
  | { type: 'community_reply'; recipientUserId: string }

function mapPreferenceRow(preference?: Partial<NotificationPreference> | null): ResolvedNotificationPreferences {
  if (!preference) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return {
    inAppEnabled: preference.inAppEnabled ?? preference.inApp ?? true,
    emailEnabled: preference.emailEnabled ?? preference.email ?? true,
    portfolioUpdatesEmail: preference.portfolioUpdatesEmail ?? preference.onSignal ?? true,
    cryptoCompassEmail: preference.cryptoCompassEmail ?? preference.onEpisode ?? true,
    learningHubEmail: preference.learningHubEmail ?? preference.onResearch ?? true,
    communityMentionsEmail: preference.communityMentionsEmail ?? preference.onMention ?? true,
    communityRepliesEmail: preference.communityRepliesEmail ?? preference.onReply ?? true,
  }
}

function normalizeTier(rawTier: string | null | undefined): MembershipTier {
  if (rawTier === 'T2' || rawTier === 'T3') {
    return 'T2'
  }
  return 'T1'
}

function tierRank(tier: MembershipTier): number {
  return tier === 'T2' ? 2 : 1
}

function isMembershipTierEligible(userTier: MembershipTier, requiredTier: MembershipTier) {
  return tierRank(userTier) >= tierRank(requiredTier)
}

function isEmailTypeEnabled(type: NotificationEmailType, prefs: ResolvedNotificationPreferences): boolean {
  if (!prefs.emailEnabled) return false

  switch (type) {
    case 'portfolio_update':
      return prefs.portfolioUpdatesEmail
    case 'crypto_compass':
      return prefs.cryptoCompassEmail
    case 'learning_hub':
      return prefs.learningHubEmail
    case 'community_mention':
      return prefs.communityMentionsEmail
    case 'community_reply':
      return prefs.communityRepliesEmail
    default:
      return false
  }
}

function activeMembershipWhere(now: Date): Prisma.MembershipWhereInput {
  return {
    status: { in: ['active', 'trial'] },
    OR: [
      { currentPeriodEnd: null },
      { currentPeriodEnd: { gte: now } },
    ],
  }
}

export function resolveNotificationPrefs(
  preference?: Partial<NotificationPreference> | null
): ResolvedNotificationPreferences {
  return mapPreferenceRow(preference)
}

export async function getNotificationPrefs(userId: string): Promise<ResolvedNotificationPreferences> {
  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })

  return mapPreferenceRow(preference)
}

export async function canSendEmail(userId: string, type: NotificationEmailType): Promise<boolean> {
  const prefs = await getNotificationPrefs(userId)
  return isEmailTypeEnabled(type, prefs)
}

export function canSendEmailFromPrefs(type: NotificationEmailType, prefs: ResolvedNotificationPreferences): boolean {
  return isEmailTypeEnabled(type, prefs)
}

export async function resolveEmailRecipientsForEvent(
  event: NotificationRecipientEvent
): Promise<ResolvedEmailRecipient[]> {
  const now = new Date()

  if (event.type === 'community_mention' || event.type === 'community_reply') {
    const user = await prisma.user.findUnique({
      where: { id: event.recipientUserId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        notificationPreference: true,
        memberships: {
          where: activeMembershipWhere(now),
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { tier: true },
        },
      },
    })

    if (!user?.email || !user.isActive) return []

    const membership = user.memberships[0]
    if (!membership) return []

    const tier = normalizeTier(membership.tier)
    const preferences = mapPreferenceRow(user.notificationPreference)
    if (!isEmailTypeEnabled(event.type, preferences)) return []

    return [
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        tier,
        preferences,
      },
    ]
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['member', 'editor', 'admin'] },
      isActive: true,
      memberships: { some: activeMembershipWhere(now) },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreference: true,
      memberships: {
        where: activeMembershipWhere(now),
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { tier: true },
      },
    },
  })

  return users
    .map((user) => {
      const membership = user.memberships[0]
      if (!user.email || !membership) return null

      const tier = normalizeTier(membership.tier)
      const preferences = mapPreferenceRow(user.notificationPreference)

      if (event.type === 'portfolio_update' && !isMembershipTierEligible(tier, event.requiredTier)) {
        return null
      }

      if ((event.type === 'crypto_compass' || event.type === 'learning_hub') && event.minTier) {
        if (!isMembershipTierEligible(tier, event.minTier)) return null
      }

      if (!isEmailTypeEnabled(event.type, preferences)) return null

      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        tier,
        preferences,
      }
    })
    .filter((recipient): recipient is ResolvedEmailRecipient => recipient !== null)
}
