import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendWelcomeEmail } from '@/lib/email'
import { emitEvent } from '@/lib/events'
import { sendTrialStartedToKlaviyo } from '@/lib/klaviyo/events'

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

  void sendWelcomeEmail({
    to: user.email,
    userName: user.name,
  }).catch((error) => {
    logger.error(
      'Failed to send welcome email (trial)',
      error instanceof Error ? error : new Error(String(error)),
      { userId, userEmail: user.email }
    )
  })

  void sendTrialStartedToKlaviyo(
    {
      id: userId,
      email: user.email,
      name: user.name,
    },
    membership
  )

  await emitEvent('Trial Started', {
    trialEnd: membership.currentPeriodEnd ? membership.currentPeriodEnd.toISOString() : null,
    tier: membership.tier || null,
    source: input.source || null,
  }, {
    userId,
    email: user.email,
  })

  return { queued: true as const }
}






