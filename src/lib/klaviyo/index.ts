import { klaviyoRequest } from './client'

type UpsertProfileInput = {
  email: string
  firstName?: string | null
  lastName?: string | null
  properties?: Record<string, unknown>
}

type TrackEventInput = {
  email: string
  eventName: string
  properties?: Record<string, unknown>
}

export async function upsertKlaviyoProfile({
  email,
  firstName,
  lastName,
  properties,
}: UpsertProfileInput) {
  const attributes: Record<string, unknown> = { email }

  if (firstName) {
    attributes.first_name = firstName
  }

  if (lastName) {
    attributes.last_name = lastName
  }

  const data: Record<string, unknown> = {
    type: 'profile',
    attributes,
  }

  if (properties && Object.keys(properties).length > 0) {
    data.properties = properties
  }

  return klaviyoRequest('profiles/', { data })
}

export async function trackKlaviyoEvent({
  email,
  eventName,
  properties,
}: TrackEventInput) {
  const eventProperties = properties || {}

  return klaviyoRequest('events/', {
    data: {
      type: 'event',
      attributes: {
        properties: eventProperties,
        metric: {
          data: {
            type: 'metric',
            attributes: { name: eventName },
          },
        },
        profile: {
          data: {
            type: 'profile',
            attributes: { email },
          },
        },
      },
    },
  })
}
