import { upload } from '@vercel/blob/client'
import { encode } from 'next-auth/jwt'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:5000'
const SECRET =
  process.env.NEXTAUTH_SECRET ||
  'dev-secret-key-for-local-development-only-not-for-production-use'

async function createAdminSessionToken() {
  return encode({
    secret: SECRET,
    token: {
      sub: 'learning-upload-smoke',
      email: 'smoke-admin@local.test',
      role: 'admin',
      name: 'Smoke Admin'
    }
  })
}

async function run() {
  console.log('Learning upload smoke test')
  console.log('Base URL:', BASE_URL)

  const sessionToken = await createAdminSessionToken()
  const requestId = `smoke_${Date.now()}`

  const blob = new Blob(['smoke-test'], { type: 'video/mp4' })
  const pathname = `learning/smoke/${requestId}.mp4`

  try {
    const result = await upload(pathname, blob, {
      access: 'public',
      contentType: 'video/mp4',
      handleUploadUrl: `${BASE_URL}/api/upload/learning`,
      multipart: false,
      headers: {
        Cookie: `next-auth.session-token=${sessionToken}`
      },
      clientPayload: JSON.stringify({
        requestId,
        originalName: 'smoke-test.mp4',
        contentType: 'video/mp4',
        size: blob.size
      })
    })

    const url = new URL(result.url)
    console.log('Upload succeeded:', url.toString())
    console.log('Blob path:', result.pathname)
  } catch (error) {
    console.error('Smoke test failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

run().catch((error) => {
  console.error('Smoke test failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
