import { EventProvider, EventPayload } from './types'
import { logger } from '@/lib/logger'

export const noopProvider: EventProvider = {
  name: 'noop',
  async emit(payload: EventPayload) {
    logger.info('Event emitted (noop)', {
      name: payload.name,
      hasIdentifiers: !!payload.identifiers,
    })
  }
}

