import { logger } from '@/lib/logger'
import { identifyCustomer, isCustomerIoEnabled, trackEvent } from './client'

type TrialUser = {
  id: string
  email?: string | null
  name?: string | null
}

type TrialMembership = {
  status: string
  currentPeriodEnd?: Date | null
  currentPeriodStart?: Date | null
  tier?: string | null
}

export type TrialStartedCustomerIoResult = {
  ok: boolean
  error?: string
  identify: {
    ok: boolean
    status: number
  }
  event: {
    ok: boolean
    status: number
  }
}

function getTrialWindow(membership: TrialMembership) {
  const trialStartAtDate = membership.currentPeriodStart ?? new Date()
  const fallbackTrialEndAtDate = new Date(trialStartAtDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const trialEndAtDate = membership.currentPeriodEnd ?? fallbackTrialEndAtDate
  const msDifference = trialEndAtDate.getTime() - trialStartAtDate.getTime()
  const trialLengthDays = Math.max(1, Math.round(msDifference / (24 * 60 * 60 * 1000)))

  return {
    trialStartAt: trialStartAtDate.toISOString(),
    trialEndAt: trialEndAtDate.toISOString(),
    trialLengthDays,
  }
}

export async function sendTrialStartedToCustomerIo(
  user: TrialUser,
  membership: TrialMembership
): Promise<TrialStartedCustomerIoResult> {
  if (!isCustomerIoEnabled()) {
    return {
      ok: false,
      error: 'customerio-disabled',
      identify: { ok: false, status: 0 },
      event: { ok: false, status: 0 },
    }
  }

  if (!user.id) {
    logger.warn('Customer.io trial event skipped: missing user identifier')
    return {
      ok: false,
      error: 'missing-identifier',
      identify: { ok: false, status: 0 },
      event: { ok: false, status: 0 },
    }
  }

  try {
    const { trialStartAt, trialEndAt, trialLengthDays } = getTrialWindow(membership)

    const identify = await identifyCustomer(user.id, {
      email: user.email ?? null,
      name: user.name ?? null,
      membershipStatus: 'trial',
      trialStartAt,
      trialEndAt,
      trialLengthDays,
    })

    const event = await trackEvent(user.id, 'trial_started', {
      trialEndAt,
      trialLengthDays,
    })

    if (identify.ok && event.ok) {
      logger.info('Customer.io trial event sent', { userId: user.id })
    } else {
      logger.warn('Customer.io trial event returned non-2xx', {
        userId: user.id,
        identifyStatus: identify.status,
        eventStatus: event.status,
      })
    }

    return {
      ok: identify.ok && event.ok,
      identify: { ok: identify.ok, status: identify.status },
      event: { ok: event.ok, status: event.status },
    }
  } catch (error) {
    logger.error(
      'Failed to send Customer.io trial event',
      error instanceof Error ? error : new Error(String(error)),
      { userId: user.id }
    )
    return {
      ok: false,
      error: 'request-failed',
      identify: { ok: false, status: 0 },
      event: { ok: false, status: 0 },
    }
  }
}
