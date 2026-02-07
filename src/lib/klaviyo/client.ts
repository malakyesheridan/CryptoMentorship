import { logger } from '@/lib/logger'

const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api/'
const KLAVIYO_REVISION = '2024-10-15'

const MAX_LOG_BODY_CHARS = 2000

export function isKlaviyoEnabled() {
  return process.env.KLAVIYO_ENABLED === 'true'
}

export type KlaviyoResult = {
  ok: boolean
  status: number
  body: unknown
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

export async function klaviyoRequest(path: string, body: unknown): Promise<KlaviyoResult> {
  if (typeof window !== 'undefined') {
    throw new Error('Klaviyo requests must be made server-side')
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY
  if (!apiKey) {
    logger.error('Klaviyo request skipped: missing API key')
    return {
      ok: false,
      status: 0,
      body: { error: 'missing-api-key' },
    }
  }

  const sanitizedPath = path.replace(/^\/+/, '')
  const url = new URL(sanitizedPath, KLAVIYO_BASE_URL)

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        accept: 'application/json',
        'content-type': 'application/json',
        revision: KLAVIYO_REVISION,
      },
      body: JSON.stringify(body),
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
      logger.warn('Klaviyo request returned non-2xx', {
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
    logger.error(
      'Klaviyo request failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return {
      ok: false,
      status: 0,
      body: { error: 'fetch-failed', message: error instanceof Error ? error.message : String(error) },
    }
  }
}
