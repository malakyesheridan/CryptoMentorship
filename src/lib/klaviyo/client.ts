const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api/'
const KLAVIYO_REVISION = '2024-10-15'

export function isKlaviyoEnabled() {
  return process.env.KLAVIYO_ENABLED === 'true'
}

export async function klaviyoRequest(path: string, body: unknown) {
  if (typeof window !== 'undefined') {
    throw new Error('Klaviyo requests must be made server-side')
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY
  if (!apiKey) {
    throw new Error('KLAVIYO_PRIVATE_API_KEY is not set')
  }

  const sanitizedPath = path.replace(/^\/+/, '')
  const url = new URL(sanitizedPath, KLAVIYO_BASE_URL)

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

  if (!response.ok) {
    const error = new Error(`Klaviyo request failed (${response.status})`)
    ;(error as Error & { status?: number }).status = response.status
    ;(error as Error & { body?: string }).body = responseText || undefined
    throw error
  }

  if (!responseText) return null

  try {
    return JSON.parse(responseText)
  } catch {
    return responseText
  }
}
