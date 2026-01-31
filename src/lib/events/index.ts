import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { noopProvider } from './providers/noop'
import { klaviyoProvider } from './providers/klaviyo'
import type { EventIdentifiers, EventPayload, EventProvider } from './providers/types'

export { emit } from './notifications'
export type { AppEvent } from './notifications'

const providerMap: Record<string, EventProvider> = {
  noop: noopProvider,
  klaviyo: klaviyoProvider,
}

function resolveProvider(): EventProvider {
  const configured = env.EVENTS_PROVIDER || 'noop'
  return providerMap[configured] || noopProvider
}

export async function emitEvent(
  name: string,
  props: Record<string, unknown>,
  identifiers?: EventIdentifiers
) {
  try {
    const provider = resolveProvider()
    const payload: EventPayload = { name, props, identifiers }
    await provider.emit(payload)
  } catch (error) {
    logger.error(
      'Failed to emit external event',
      error instanceof Error ? error : new Error(String(error)),
      { eventName: name }
    )
  }
}

