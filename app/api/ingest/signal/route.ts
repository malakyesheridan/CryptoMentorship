import { NextRequest, NextResponse } from 'next/server'
import { ingestSchema, processSignalIngest } from '@/lib/systems/ingest'

export const dynamic = 'force-dynamic'

function authorizeIngest(request: NextRequest): boolean {
  const expected =
    process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  if (!expected) return false

  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (token === expected) return true
  }
  // Same internal token header used by cron handlers, accepted as a fallback.
  const internal = request.headers.get('x-internal-job-token') || ''
  if (internal && internal === expected) return true

  return false
}

export async function POST(request: NextRequest) {
  if (!authorizeIngest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ingestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 400 }
    )
  }

  const result = await processSignalIngest(parsed.data, 'api')
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: result.status }
    )
  }

  return NextResponse.json({
    success: true,
    system: result.system,
    signal: result.signal,
    portfolioSignalId: result.portfolioSignalId,
    emailsQueued: result.emailsQueued,
    ingestId: result.ingestId,
  })
}
