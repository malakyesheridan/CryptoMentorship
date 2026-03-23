import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { enqueueEmail } from '@/lib/email/outbox'
import { resolveEmailRecipientsForEvent, shouldSendInAppNotification } from '@/lib/notifications/preferences'
import { buildNotificationDedupeKey, type NotificationEvent } from '@/lib/notifications/types'

interface DailySignal {
  id: string
  tier: 'T1' | 'T2'
  category?: 'majors' | 'memecoins' | null
  signal: string
  primaryAsset?: string | null
  secondaryAsset?: string | null
  tertiaryAsset?: string | null
  executiveSummary?: string | null
  associatedData?: string | null
  publishedAt: Date
}

function resolveBaseUrl() {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  return baseUrl.replace(/\/$/, '')
}

function mapSignalTier(signal: { tier: string; category?: string | null }): 'T1' | 'T2' {
  const hasCategory = signal.category === 'majors' || signal.category === 'memecoins'
  if (signal.tier === 'T3') return 'T2'
  if (signal.tier === 'T2' && hasCategory) return 'T2'
  return 'T1'
}

function sameUtcDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
}

export async function sendSignalEmails(signalId: string): Promise<void> {
  logger.info('sendSignalEmails enqueue flow started', { signalId })

  const createdSignal = await prisma.portfolioDailySignal.findUnique({
    where: { id: signalId },
  })

  if (!createdSignal) {
    logger.warn('Portfolio signal not found for enqueue', { signalId })
    return
  }

  const signalTier = mapSignalTier(createdSignal)
  let canonicalSignal = createdSignal as DailySignal
  let signalsForEmail: DailySignal[] = [createdSignal as DailySignal]

  if (signalTier === 'T2' && (createdSignal.category === 'majors' || createdSignal.category === 'memecoins')) {
    const pairedCategory = createdSignal.category === 'majors' ? 'memecoins' : 'majors'
    const candidateSignals = await prisma.portfolioDailySignal.findMany({
      where: {
        tier: 'T2',
        category: { in: ['majors', 'memecoins'] },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    })

    const pairedSignal = candidateSignals.find((signal) => {
      return signal.category === pairedCategory && sameUtcDay(signal.publishedAt, createdSignal.publishedAt)
    })

    if (!pairedSignal) {
      logger.info('Portfolio T2 email enqueue deferred until paired category exists', {
        signalId,
        category: createdSignal.category,
      })
      return
    }

    const createdTs = createdSignal.publishedAt.getTime()
    const pairedTs = pairedSignal.publishedAt.getTime()
    const canonicalIsCurrent = createdTs > pairedTs || (createdTs === pairedTs && createdSignal.id > pairedSignal.id)

    if (!canonicalIsCurrent) {
      logger.info('Portfolio T2 email enqueue skipped because paired signal is canonical sender', {
        signalId,
        pairedSignalId: pairedSignal.id,
      })
      return
    }

    canonicalSignal = createdSignal as DailySignal
    signalsForEmail = createdSignal.category === 'majors'
      ? [createdSignal as DailySignal, pairedSignal as DailySignal]
      : [pairedSignal as DailySignal, createdSignal as DailySignal]
  }

  const recipients = await resolveEmailRecipientsForEvent({
    type: 'portfolio_update',
    requiredTier: signalTier,
  })

  // Preserve existing behavior: T1 updates go to T1 members, T2 updates go to T2 members.
  const tierMatchedRecipients = recipients.filter((recipient) => recipient.tier === signalTier)

  if (tierMatchedRecipients.length === 0) {
    logger.info('No recipients eligible for portfolio signal email enqueue', {
      signalId,
      signalTier,
    })
    return
  }

  const baseUrl = resolveBaseUrl()
  const portfolioUrl = `${baseUrl}/portfolio`
  const preferencesUrl = `${baseUrl}/account`
  const signalRevisionSubjectId = `${canonicalSignal.id}:rev:${createdSignal.updatedAt.getTime()}`

  const enqueueResults = await Promise.all(
    tierMatchedRecipients.map((recipient) => {
      const serializedSignals = signalsForEmail.map((signal) => ({
        ...signal,
        publishedAt: signal.publishedAt.toISOString(),
      }))

      const notificationEvent: NotificationEvent = {
        type: 'portfolio_update',
        // Use signal revision in subjectId so edits to the same signal can enqueue again.
        subjectId: signalRevisionSubjectId,
        actorId: createdSignal.createdById ?? null,
        recipientUserId: recipient.userId,
        metadata: {
          signalId: createdSignal.id,
          signalTier,
          signalCategory: createdSignal.category,
        },
      }

      return enqueueEmail({
        to: recipient.email,
        userId: recipient.userId,
        templateKey: 'portfolio_update',
        subject: 'Daily Portfolio Update',
        variables: {
          userName: recipient.name,
          signals: serializedSignals,
          portfolioUrl,
          preferencesUrl,
        },
        dedupeKey: buildNotificationDedupeKey(notificationEvent, recipient.userId),
      })
    })
  )

  const queuedCount = enqueueResults.filter((result) => result.queued).length
  const duplicateCount = enqueueResults.filter((result) => result.reason === 'duplicate').length
  const failedCount = enqueueResults.filter((result) => result.reason === 'error').length

  logger.info('Portfolio signal emails enqueued via outbox', {
    signalId,
    signalTier,
    category: createdSignal.category,
    recipients: tierMatchedRecipients.length,
    queuedCount,
    duplicateCount,
    failedCount,
  })

  // Create in-app notifications for eligible recipients
  const inAppNotifications = tierMatchedRecipients
    .filter((recipient) => shouldSendInAppNotification('portfolio_update', recipient.preferences))
    .map((recipient) => ({
      userId: recipient.userId,
      type: 'portfolio_update' as const,
      entityType: 'signal' as const,
      entityId: signalId,
      title: 'Daily Portfolio Update',
      body: 'A new portfolio signal has been published.',
      url: portfolioUrl.replace(baseUrl, ''),
      channel: 'inapp' as const,
    }))

  if (inAppNotifications.length > 0) {
    await prisma.notification.createMany({ data: inAppNotifications })
  }

  logger.info('Portfolio signal in-app notifications created', {
    signalId,
    signalTier,
    inAppCount: inAppNotifications.length,
  })
}
