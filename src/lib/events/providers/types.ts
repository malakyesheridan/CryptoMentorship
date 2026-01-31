export type EventIdentifiers = {
  userId?: string
  email?: string
}

export type EventPayload = {
  name: string
  props: Record<string, unknown>
  identifiers?: EventIdentifiers
}

export interface EventProvider {
  name: string
  emit: (payload: EventPayload) => Promise<void>
}

