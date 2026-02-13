import 'server-only'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const CUSTOMERIO_TIMEOUT_MS = 10_000
const MAX_LOG_BODY_CHARS = 2000

type CustomerIoRegion = 'us' | 'eu'
type CustomerIoMethod = 'PUT' | 'POST'

export type CustomerIoResult = {
  ok: boolean
  status: number
  body: unknown
}

type CustomerIoConfig = {
  baseUrl: string
  authHeader: string
}

function truncateBody(value: unknown) {
  if (value == null) return value
  let text: string
  if (typeof value === 'string') {
    text = value
  } else {
    try {
      text = JSON.stringify(value)
    } catch {
      return '[Unserializable body]'
    }
  }
  if (text.length <= MAX_LOG_BODY_CHARS) return value
  return `${text.slice(0, MAX_LOG_BODY_CHARS)}...`
}

export function isCustomerIoEnabled() {
  return env.CUSTOMERIO_ENABLED === true
}

function getCustomerIoBaseUrl(region: CustomerIoRegion) {
  return region === 'eu' ? 'https://track-eu.customer.io' : 'https://track.customer.io'
}

function getCustomerIoConfig(): CustomerIoConfig | null {
  if (!isCustomerIoEnabled()) {
    return null
  }

  const siteId = env.CUSTOMERIO_SITE_ID
  const trackApiKey = env.CUSTOMERIO_TRACK_API_KEY
  const region = env.CUSTOMERIO_REGION

  if (!siteId || !trackApiKey || !region) {
    logger.error('Customer.io request skipped: incomplete configuration', undefined, {
      hasSiteId: Boolean(siteId),
      hasTrackApiKey: Boolean(trackApiKey),
      region: region || null,
    })
    return null
  }

  const basicAuthValue = Buffer.from(`${siteId}:${trackApiKey}`).toString('base64')

  return {
    baseUrl: getCustomerIoBaseUrl(region),
    authHeader: `Basic ${basicAuthValue}`,
  }
}

async function customerIoRequest(
  path: string,
  method: CustomerIoMethod,
  body: unknown
): Promise<CustomerIoResult> {
  if (typeof window !== 'undefined') {
    return {
      ok: false,
      status: 0,
      body: { error: 'server-only' },
    }
  }

  const config = getCustomerIoConfig()
  if (!config) {
    return {
      ok: false,
      status: 0,
      body: {
        error: isCustomerIoEnabled() ? 'invalid-config' : 'customerio-disabled',
      },
    }
  }

  const sanitizedPath = path.replace(/^\/+/, '')
  const url = new URL(sanitizedPath, `${config.baseUrl}/`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CUSTOMERIO_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: config.authHeader,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let parsedBody: unknown = responseText

    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText)
      } catch {
        parsedBody = responseText
      }
    } else {
      parsedBody = null
    }

    if (!response.ok) {
      logger.warn('Customer.io request returned non-2xx', {
        method,
        path: sanitizedPath,
        status: response.status,
        body: truncateBody(parsedBody),
      })
    }

    return {
      ok: response.ok,
      status: response.status,
      body: parsedBody,
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))

    logger.error(
      isTimeout ? 'Customer.io request timed out' : 'Customer.io request failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        method,
        path: sanitizedPath,
        timeoutMs: CUSTOMERIO_TIMEOUT_MS,
      }
    )

    return {
      ok: false,
      status: 0,
      body: {
        error: isTimeout ? 'timeout' : 'fetch-failed',
        message: error instanceof Error ? error.message : String(error),
      },
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function identifyCustomer(
  identifier: string,
  attributes: Record<string, unknown>
): Promise<CustomerIoResult> {
  if (!identifier) {
    return {
      ok: false,
      status: 0,
      body: { error: 'missing-identifier' },
    }
  }

  return customerIoRequest(
    `/api/v1/customers/${encodeURIComponent(identifier)}`,
    'PUT',
    attributes
  )
}

export async function trackEvent(
  identifier: string,
  name: string,
  data: Record<string, unknown>
): Promise<CustomerIoResult> {
  if (!identifier) {
    return {
      ok: false,
      status: 0,
      body: { error: 'missing-identifier' },
    }
  }

  if (!name) {
    return {
      ok: false,
      status: 0,
      body: { error: 'missing-event-name' },
    }
  }

  return customerIoRequest(
    `/api/v1/customers/${encodeURIComponent(identifier)}/events`,
    'POST',
    {
      name,
      data,
    }
  )
}
