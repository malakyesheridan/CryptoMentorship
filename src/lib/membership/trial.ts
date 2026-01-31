import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { enqueueEmail } from '@/lib/email-outbox'
import { EmailType } from '@prisma/client'
import { emitEvent } from '@/lib/events'

export type TrialMembershipSnapshot = {
  status: string
  currentPeriodEnd?: Date | null
  currentPeriodStart?: Date | null
  tier?: string | null
}

type OnTrialStartedInput = {
  userId: string
  membership: TrialMembershipSnapshot
  user?: { email?: string | null; name?: string | null }
  source?: string
}

function resolveBaseUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXTAUTH_URL
    || process.env.VERCEL_URL
    || 'http://localhost:3000'

  if (baseUrl && !baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }

  return baseUrl.replace(/\/$/, '')
}

export async function onTrialStarted(input: OnTrialStartedInput) {
  const { userId, membership } = input

  if (membership.status !== 'trial') {
    return { queued: false, reason: 'not-trial' as const }
  }

  const now = new Date()
  if (membership.currentPeriodEnd && membership.currentPeriodEnd <= now) {
    return { queued: false, reason: 'trial-expired' as const }
  }

  let user = input.user
  if (!user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })
    user = dbUser || undefined
  }

  if (!user?.email) {
    logger.warn('Trial welcome email skipped: user email missing', { userId })
    return { queued: false, reason: 'missing-email' as const }
  }

  const baseUrl = resolveBaseUrl()
  const primaryCTAUrl = `${baseUrl}/portfolio`
  const supportUrl = `${baseUrl}/account`
  const idempotencyKey = `welcome:${userId}`

  const enqueueResult = await enqueueEmail({
    type: EmailType.WELCOME,
    toEmail: user.email,
    userId,
    idempotencyKey,
    payload: {
      firstName: user.name || null,
      primaryCTAUrl,
      supportUrl,
    }
  })

  await emitEvent('Trial Started', {
    trialEnd: membership.currentPeriodEnd ? membership.currentPeriodEnd.toISOString() : null,
    tier: membership.tier || null,
    source: input.source || null,
  }, {
    userId,
    email: user.email,
  })

  return enqueueResult
}

