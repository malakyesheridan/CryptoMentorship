import { logger } from '@/lib/logger'
import { emitStrict, type AppEvent } from './notifications'

type TriggerNotificationEventDispatchInput = {
  event: AppEvent
  origin: string
  source: string
}

function buildDispatchUrl(origin: string) {
  const url = new URL('/api/cron/notification-events', origin)
  if (process.env.VERCEL_CRON_SECRET) {
    url.searchParams.set('secret', process.env.VERCEL_CRON_SECRET)
  }
  return url.toString()
}

export function triggerNotificationEventDispatch(input: TriggerNotificationEventDispatchInput) {
  const internalDispatchSecret = process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (internalDispatchSecret) {
    headers['x-internal-job-token'] = internalDispatchSecret
  }

  const fallbackToDirectEmit = () => {
    void emitStrict(input.event).catch((error) => {
      logger.error(
        'Notification event direct fallback failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          source: input.source,
          eventType: input.event.type,
        }
      )
    })
  }

  let url: string
  try {
    url = buildDispatchUrl(input.origin)
  } catch (error) {
    logger.warn('Invalid origin while building notification dispatch URL; using direct fallback', {
      source: input.source,
      eventType: input.event.type,
      origin: input.origin,
      error: error instanceof Error ? error.message : String(error),
    })
    fallbackToDirectEmit()
    return
  }

  void fetch(url, {
    method: 'POST',
    keepalive: true,
    headers,
    body: JSON.stringify(input.event),
  })
    .then((response) => {
      if (!response.ok) {
        logger.warn('Notification dispatch returned non-success response; falling back to direct emit', {
          source: input.source,
          eventType: input.event.type,
          status: response.status,
        })
        fallbackToDirectEmit()
      }
    })
    .catch((error) => {
      logger.warn('Failed to trigger notification dispatch; falling back to direct emit', {
        source: input.source,
        eventType: input.event.type,
        error: error instanceof Error ? error.message : String(error),
      })
      fallbackToDirectEmit()
    })
}
