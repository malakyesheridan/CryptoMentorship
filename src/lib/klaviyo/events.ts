import { logger } from '@/lib/logger'
import { isKlaviyoEnabled } from './client'
import { trackKlaviyoEvent, upsertKlaviyoProfile } from './index'

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

function splitName(fullName?: string | null) {
  if (!fullName) return { firstName: null, lastName: null }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

export async function sendTrialStartedToKlaviyo(
  user: TrialUser,
  membership: TrialMembership
) {
  if (!isKlaviyoEnabled()) {
    return { ok: false, error: 'klaviyo-disabled' }
  }

  const email = user.email || null
  if (!email) {
    logger.warn('Klaviyo trial event skipped: missing email', { userId: user.id })
    return { ok: false, error: 'missing-email' }
  }

  const { firstName, lastName } = splitName(user.name)

  try {
    const profile = await upsertKlaviyoProfile({
      email,
      firstName,
      lastName,
    })

    const event = await trackKlaviyoEvent({
      email,
      eventName: 'Trial Started',
      properties: {
        user_id: user.id,
        email,
        trial_end: membership.currentPeriodEnd
          ? membership.currentPeriodEnd.toISOString()
          : null,
        tier: membership.tier || null,
        membership_status: 'trial',
      },
    })

    if (profile.ok && event.ok) {
      logger.info('Klaviyo trial event sent', { userId: user.id, email })
    } else {
      logger.warn('Klaviyo trial event returned non-2xx', {
        userId: user.id,
        email,
        profileStatus: profile.status,
        eventStatus: event.status,
      })
    }

    return {
      ok: true,
      profile,
      event,
    }
  } catch (error) {
    logger.error(
      'Failed to send Klaviyo trial event',
      error instanceof Error ? error : new Error(String(error)),
      { userId: user.id, email }
    )
    return { ok: false, error: 'request-failed' }
  }
}
