import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot'
import { getActiveSystems } from '@/lib/system-registry'
import { processSignalIngest, type IngestPayload } from '@/lib/systems/ingest'
import { detectChange } from '@/lib/systems/snapshot-mappers'

export const dynamic = 'force-dynamic'

// Legacy snapshot-diff route. No longer wired to a Vercel cron — daily
// emails fire from /api/cron/daily-signal-digest, which always upserts
// today's signal regardless of diff. Kept callable so support can manually
// poke the diff path during incidents and for backwards compatibility with
// any existing operator runbooks/curls.

function authorizeCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET
  const internalDispatchSecret =
    process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'

  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  const querySecret = request.nextUrl.searchParams.get('secret') || ''
  const internalToken = request.headers.get('x-internal-job-token') || ''

  if (isVercelCron) return true
  if (cronSecret && (bearer === cronSecret || querySecret === cronSecret)) return true
  if (
    internalDispatchSecret &&
    (internalToken === internalDispatchSecret || bearer === internalDispatchSecret)
  )
    return true
  if (!isProduction && !cronSecret) return true
  return false
}

type SystemOutcome = {
  system: string
  changed: boolean
  reason: string
  ingestId?: string
}

async function runBridge() {
  const snapshot = await getDashboardSnapshot({ fresh: true })
  const systems = getActiveSystems()

  const outcomes: SystemOutcome[] = []
  const changedPayloads: IngestPayload[] = []

  for (const sys of systems) {
    try {
      const detection = await detectChange(sys, snapshot)
      if (!detection.changed || !detection.payload) {
        outcomes.push({
          system: sys.slug,
          changed: false,
          reason: detection.reason,
        })
        continue
      }

      const result = await processSignalIngest(detection.payload, 'cron')
      if (!result.ok) {
        outcomes.push({
          system: sys.slug,
          changed: false,
          reason: `ingest failed: ${result.error}`,
        })
        continue
      }

      changedPayloads.push(detection.payload)
      outcomes.push({
        system: sys.slug,
        changed: true,
        reason: detection.reason,
        ingestId: result.ingestId,
      })
    } catch (error) {
      logger.error(
        'Signal bridge per-system error',
        error instanceof Error ? error : new Error(String(error)),
        { systemSlug: sys.slug }
      )
      outcomes.push({
        system: sys.slug,
        changed: false,
        reason: `exception: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const summary = {
    snapshotTimestamp: snapshot.timestamp,
    systemsChecked: outcomes.length,
    signalsDetected: outcomes.filter((o) => o.changed).length,
    outcomes,
  }

  logger.info('Signal bridge run complete (diff-only; emails now fire from /api/cron/daily-signal-digest)', summary)
  return summary
}

export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid cron secret' },
      { status: 401 }
    )
  }
  try {
    const summary = await runBridge()
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error(
      'Signal bridge cron failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
