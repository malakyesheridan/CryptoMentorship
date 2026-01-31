import { EventProvider, EventPayload } from './types'
import { logger } from '@/lib/logger'

export const klaviyoProvider: EventProvider = {
  name: 'klaviyo',
  async emit(payload: EventPayload) {
    // Stub for future Klaviyo integration
    logger.info('Klaviyo provider not configured; event skipped', {
      name: payload.name,
      hasIdentifiers: !!payload.identifiers,
    })
  }
}

