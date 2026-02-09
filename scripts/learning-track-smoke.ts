import { encode } from 'next-auth/jwt'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:5000'
const SECRET =
  process.env.NEXTAUTH_SECRET ||
  'dev-secret-key-for-local-development-only-not-for-production-use'

function cookieHeader(token: string) {
  return `next-auth.session-token=${token}`
}

async function createAdminSessionToken() {
  return encode({
    secret: SECRET,
    token: {
      sub: `learning-track-smoke-${Date.now()}`,
      email: 'smoke-admin@local.test',
      role: 'admin',
      name: 'Smoke Admin',
    },
  })
}

async function run() {
  const token = await createAdminSessionToken()
  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader(token),
  }

  const health = await fetch(`${BASE_URL}/api/health/db`, {
    method: 'GET',
    headers: { Cookie: cookieHeader(token) },
  })
  const healthPayload = await health.json().catch(() => null)
  if (!health.ok || !healthPayload?.ok) {
    throw new Error(
      `[learning-track-smoke] db health failed: ${healthPayload?.message || `HTTP ${health.status}`}`
    )
  }
  console.log('[learning-track-smoke] db health OK')

  const suffix = Date.now().toString().slice(-6)
  const baseTitle = 'Test Track'
  const baseSlug = `test-track-${suffix}`

  const createFirst = await fetch(`${BASE_URL}/api/admin/learning-tracks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: baseTitle,
      slug: baseSlug,
      summary: 'smoke test record',
      minTier: 'member',
      requestId: `smoke-first-${suffix}`,
    }),
  })
  const firstPayload = await createFirst.json().catch(() => null)
  if (!createFirst.ok || !firstPayload?.success) {
    throw new Error(
      `[learning-track-smoke] initial create failed: ${firstPayload?.message || `HTTP ${createFirst.status}`}`
    )
  }
  console.log(`[learning-track-smoke] first create OK: ${firstPayload.track.slug}`)

  const collision = await fetch(`${BASE_URL}/api/admin/learning-tracks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: baseTitle,
      slug: baseSlug,
      summary: 'collision smoke test',
      minTier: 'member',
      requestId: `smoke-collision-${suffix}`,
    }),
  })
  const collisionPayload = await collision.json().catch(() => null)
  if (collision.status !== 409 || collisionPayload?.error !== 'slug_taken' || !collisionPayload?.suggestion) {
    throw new Error(
      `[learning-track-smoke] expected 409 slug_taken with suggestion, got status=${collision.status} body=${JSON.stringify(
        collisionPayload
      )}`
    )
  }
  console.log(`[learning-track-smoke] collision OK: suggestion=${collisionPayload.suggestion}`)

  const createSuggested = await fetch(`${BASE_URL}/api/admin/learning-tracks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: baseTitle,
      slug: collisionPayload.suggestion,
      summary: 'suggestion smoke test',
      minTier: 'member',
      requestId: `smoke-suggestion-${suffix}`,
    }),
  })
  const suggestedPayload = await createSuggested.json().catch(() => null)
  if (!createSuggested.ok || !suggestedPayload?.success) {
    throw new Error(
      `[learning-track-smoke] suggestion create failed: ${suggestedPayload?.message || `HTTP ${createSuggested.status}`}`
    )
  }
  console.log(`[learning-track-smoke] suggestion create OK: ${suggestedPayload.track.slug}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})

