import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot'
import { getActiveSystems, getSystem } from '@/lib/system-registry'
import {
  processSignalIngest,
  buildDigestSignal,
  buildSignalText,
  commentaryFor,
  queueDigestEmails,
  dayKey,
  type IngestPayload,
} from '@/lib/systems/ingest'
import { mapSnapshotToPayload } from '@/lib/systems/snapshot-mappers'
import type { DigestSignal } from '@/lib/templates/signal-digest'

export const dynamic = 'force-dynamic'

// ─── Auth (matches /api/cron/email-outbox + /api/cron/signal-bridge) ────────

function authorizeCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET
  const internalDispatchSecret =
    process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production'

  // Vercel cron infrastructure: legacy header (older deployments still send
  // this), current User-Agent contract (`vercel-cron/1.0` on every cron
  // invocation), and bearer signing if the env var is literally named
  // CRON_SECRET (Vercel ignores other names).
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const userAgent = request.headers.get('user-agent') || ''
  const isVercelCronUserAgent = /^vercel-cron\//i.test(userAgent)

  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  const querySecret = request.nextUrl.searchParams.get('secret') || ''
  const internalToken = request.headers.get('x-internal-job-token') || ''

  if (isVercelCron) return true
  if (isVercelCronUserAgent) return true
  if (cronSecret && (bearer === cronSecret || querySecret === cronSecret)) return true
  if (
    internalDispatchSecret &&
    (internalToken === internalDispatchSecret || bearer === internalDispatchSecret)
  )
    return true
  if (!isProduction && !cronSecret) return true
  return false
}

// ─── Day bounds ─────────────────────────────────────────────────────────────

function utcDayBounds(date: Date) {
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  )
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

// ─── Result types ───────────────────────────────────────────────────────────

type IngestOutcome = {
  system: string
  ingested: boolean
  reason: string
  ingestId?: string
}

type DigestRunSummary = {
  snapshotTimestamp: string | null
  signalDateStr: string
  ingestOutcomes: IngestOutcome[]
  signalsForDigest: number
  emailsQueued: number
}

// ─── Main handler ───────────────────────────────────────────────────────────

async function runDailyDigest(): Promise<DigestRunSummary> {
  const now = new Date()
  const signalDateStr = dayKey(now)

  // Phase A: refresh today's PortfolioDailySignal rows from the latest
  // snapshot. processSignalIngest is idempotent per (system, UTC day) — it
  // deletes today's existing row and re-inserts from the snapshot, so
  // re-running this cron (or running it after Coen's HTTP push to
  // /api/ingest/signal already wrote the same data) is safe.
  let snapshotTimestamp: string | null = null
  const ingestOutcomes: IngestOutcome[] = []

  try {
    const snapshot = await getDashboardSnapshot({ fresh: true })
    snapshotTimestamp = snapshot.timestamp ?? null
    const systems = getActiveSystems()

    for (const sys of systems) {
      const payload: IngestPayload | null = mapSnapshotToPayload(sys, snapshot)
      if (!payload) {
        ingestOutcomes.push({
          system: sys.slug,
          ingested: false,
          reason: 'no snapshot data for system',
        })
        continue
      }

      try {
        const result = await processSignalIngest(payload, 'cron')
        if (result.ok) {
          ingestOutcomes.push({
            system: sys.slug,
            ingested: true,
            reason: 'upserted from snapshot',
            ingestId: result.ingestId,
          })
        } else {
          ingestOutcomes.push({
            system: sys.slug,
            ingested: false,
            reason: `ingest failed: ${result.error}`,
          })
        }
      } catch (error) {
        logger.error(
          'Daily digest per-system ingest exception',
          error instanceof Error ? error : new Error(String(error)),
          { systemSlug: sys.slug }
        )
        ingestOutcomes.push({
          system: sys.slug,
          ingested: false,
          reason: `exception: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
  } catch (error) {
    logger.error(
      'Daily digest snapshot fetch failed; falling back to whatever PortfolioDailySignal rows already exist',
      error instanceof Error ? error : new Error(String(error))
    )
  }

  // Phase B: read everything published today for active systems and fan
  // out a single combined digest per recipient. dedupeKey
  // daily_signal_digest_<date>_<userId> ensures one email per user per
  // UTC day across all paths (this cron, manual admin trigger, ad-hoc
  // ingest pushes), so re-runs are safe.
  const activeSlugs = getActiveSystems().map((s) => s.slug)
  const { start, end } = utcDayBounds(now)

  const todaySignals = await prisma.portfolioDailySignal.findMany({
    where: {
      publishedAt: { gte: start, lt: end },
      category: { in: activeSlugs },
    },
    orderBy: { publishedAt: 'asc' },
    select: {
      id: true,
      category: true,
      signal: true,
      executiveSummary: true,
      associatedData: true,
    },
  })

  if (todaySignals.length === 0) {
    logger.warn('Daily digest cron found no signals to send', {
      signalDateStr,
      ingestOutcomes,
    })
    const summary: DigestRunSummary = {
      snapshotTimestamp,
      signalDateStr,
      ingestOutcomes,
      signalsForDigest: 0,
      emailsQueued: 0,
    }
    logger.info('Daily signal digest run complete (no signals)', summary)
    return summary
  }

  const digestSignals: DigestSignal[] = []
  for (const row of todaySignals) {
    if (!row.category) continue
    const sys = getSystem(row.category)
    if (!sys) {
      logger.warn('Daily digest skipping signal with unknown system slug', {
        signalId: row.id,
        category: row.category,
      })
      continue
    }

    let parsed: {
      systemSlug?: string
      systemName?: string
      signalType?: string
      data?: Record<string, unknown>
    } = {}
    if (row.associatedData) {
      try {
        parsed = JSON.parse(row.associatedData)
      } catch (error) {
        logger.warn('Daily digest failed to parse associatedData', {
          signalId: row.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (
      parsed.signalType !== 'rotation' &&
      parsed.signalType !== 'zone_action'
    ) {
      logger.warn('Daily digest skipping signal with invalid signal_type', {
        signalId: row.id,
        signalType: parsed.signalType,
      })
      continue
    }

    const payload = {
      system: sys.slug,
      signal_type: parsed.signalType,
      data: parsed.data ?? {},
    } as IngestPayload

    const signalText = row.signal || buildSignalText(payload)
    const commentary = row.executiveSummary?.trim() || commentaryFor(payload)

    digestSignals.push(
      buildDigestSignal(sys, payload, signalText, commentary)
    )
  }

  if (digestSignals.length === 0) {
    logger.warn('Daily digest produced zero usable signals after parsing', {
      signalDateStr,
      rowCount: todaySignals.length,
    })
    const summary: DigestRunSummary = {
      snapshotTimestamp,
      signalDateStr,
      ingestOutcomes,
      signalsForDigest: 0,
      emailsQueued: 0,
    }
    return summary
  }

  let emailsQueued = 0
  try {
    emailsQueued = await queueDigestEmails({
      signals: digestSignals,
      signalDateStr,
    })
  } catch (error) {
    logger.error(
      'Daily digest queueDigestEmails failed',
      error instanceof Error ? error : new Error(String(error)),
      { signalDateStr, slugs: digestSignals.map((s) => s.systemSlug) }
    )
  }

  const summary: DigestRunSummary = {
    snapshotTimestamp,
    signalDateStr,
    ingestOutcomes,
    signalsForDigest: digestSignals.length,
    emailsQueued,
  }
  logger.info('Daily signal digest run complete', summary)
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
    const summary = await runDailyDigest()
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error(
      'Daily signal digest cron failed',
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
