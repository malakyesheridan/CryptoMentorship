import { NextRequest, NextResponse } from 'next/server'
import { Prisma, EmailType, EmailOutboxStatus } from '@prisma/client'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getActiveSystems } from '@/lib/system-registry'
import { brandName } from '@/lib/brand'
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot'
import {
  processSignalIngest,
  buildDigestSignal,
  buildSignalText,
  commentaryFor,
  queueDigestEmails,
  dayKey,
  type IngestPayload,
} from '@/lib/systems/ingest'
import { detectChange } from '@/lib/systems/snapshot-mappers'
import { processEmailOutboxBatch } from '@/lib/email-outbox'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/systems/diagnose
 *
 * One-shot read of every link in the signal email pipeline so support
 * can answer "why didn't this email send?" without spelunking through
 * Prisma Studio. All booleans are presence-only — actual env values are
 * never returned.
 *
 * Admin-only (requireRoleAPI(['admin'])).
 */
export async function GET(_request: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const now = new Date()
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      eligibleUserCount,
      activeMembershipCount,
      notificationPrefRowCount,
      notificationPrefOptedOutEmail,
      notificationPrefOptedOutPortfolio,
      systemAssignmentTotal,
      systemAssignmentOptOuts,
      systemSignalIngestTotal,
      lastIngestPerSystem,
      emailOutboxByStatus,
      systemSignalEmailRowsTotal,
      systemSignalEmailRowsRecent,
      lastSentSignalEmail,
      stuckOutboxRows,
      lastFailedOutboxRow,
    ] = await Promise.all([
      // Users who would currently receive a digest if anything queued.
      prisma.user.count({
        where: {
          isActive: true,
          memberships: {
            some: {
              status: { in: ['active', 'trial'] },
              OR: [
                { currentPeriodEnd: null },
                { currentPeriodEnd: { gte: now } },
              ],
            },
          },
          OR: [
            { notificationPreference: null },
            {
              notificationPreference: {
                emailEnabled: true,
                portfolioUpdatesEmail: true,
              },
            },
          ],
        },
      }),
      prisma.membership.count({
        where: {
          status: { in: ['active', 'trial'] },
          OR: [
            { currentPeriodEnd: null },
            { currentPeriodEnd: { gte: now } },
          ],
        },
      }),
      prisma.notificationPreference.count(),
      prisma.notificationPreference.count({ where: { emailEnabled: false } }),
      prisma.notificationPreference.count({ where: { portfolioUpdatesEmail: false } }),
      prisma.userSystemAssignment.count(),
      prisma.userSystemAssignment.groupBy({
        by: ['systemSlug'],
        where: { isActive: false },
        _count: true,
      }),
      prisma.systemSignalIngest.count(),
      prisma.systemSignalIngest.groupBy({
        by: ['systemSlug'],
        _max: { processedAt: true },
        _count: true,
      }),
      prisma.emailOutbox.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.emailOutbox.count({
        where: { type: EmailType.NOTIFICATION_SYSTEM_SIGNAL },
      }),
      prisma.emailOutbox.count({
        where: {
          type: EmailType.NOTIFICATION_SYSTEM_SIGNAL,
          createdAt: { gte: last7d },
        },
      }),
      prisma.emailOutbox.findFirst({
        where: { type: EmailType.NOTIFICATION_SYSTEM_SIGNAL, status: EmailOutboxStatus.SENT },
        orderBy: { sentAt: 'desc' },
        select: { id: true, toEmail: true, sentAt: true, createdAt: true },
      }),
      prisma.emailOutbox.findMany({
        where: {
          status: EmailOutboxStatus.QUEUED,
          attempts: { gt: 0 },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          toEmail: true,
          attempts: true,
          lastError: true,
          scheduledFor: true,
        },
      }),
      prisma.emailOutbox.findFirst({
        where: { status: EmailOutboxStatus.FAILED },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          type: true,
          toEmail: true,
          attempts: true,
          lastError: true,
          updatedAt: true,
        },
      }),
    ])

    // Per-system payload of the most recent ingest, so admin can see what
    // key the bridge would compare against on the next firing.
    const lastIngestPayloads = await prisma.systemSignalIngest.findMany({
      where: {
        systemSlug: { in: getActiveSystems().map((s) => s.slug) },
      },
      orderBy: { processedAt: 'desc' },
      distinct: ['systemSlug'],
      select: {
        systemSlug: true,
        processedAt: true,
        signalData: true,
        emailsQueued: true,
        portfolioUpdated: true,
        source: true,
        error: true,
      },
      take: 10,
    })

    const optOutMap = new Map(
      systemAssignmentOptOuts.map((row) => [row.systemSlug, row._count])
    )
    const ingestSummaryMap = new Map(
      lastIngestPerSystem.map((row) => [
        row.systemSlug,
        { lastProcessedAt: row._max.processedAt, totalIngests: row._count },
      ])
    )
    const ingestPayloadMap = new Map(
      lastIngestPayloads.map((row) => [row.systemSlug, row])
    )

    const perSystem = getActiveSystems().map((sys) => {
      const summary = ingestSummaryMap.get(sys.slug)
      const payloadRow = ingestPayloadMap.get(sys.slug)
      const data =
        (payloadRow?.signalData as { data?: Record<string, unknown> } | null)?.data ??
        null
      return {
        slug: sys.slug,
        shortName: brandName(sys.slug),
        signalFormat: sys.signalFormat,
        optOutCount: optOutMap.get(sys.slug) ?? 0,
        totalIngests: summary?.totalIngests ?? 0,
        lastProcessedAt: summary?.lastProcessedAt ?? null,
        lastIngestSource: payloadRow?.source ?? null,
        lastEmailsQueued: payloadRow?.emailsQueued ?? null,
        lastPortfolioUpdated: payloadRow?.portfolioUpdated ?? null,
        lastError: payloadRow?.error ?? null,
        lastSignalSummary:
          payloadRow?.signalData &&
          typeof payloadRow.signalData === 'object' &&
          payloadRow.signalData !== null
            ? summarizeSignal(
                (payloadRow.signalData as { signal_type?: string }).signal_type ?? null,
                data
              )
            : null,
      }
    })

    const outboxStatuses: Record<string, number> = {
      QUEUED: 0,
      SENDING: 0,
      SENT: 0,
      FAILED: 0,
    }
    for (const row of emailOutboxByStatus) {
      outboxStatuses[row.status] = row._count
    }

    return NextResponse.json({
      now: now.toISOString(),
      eligibility: {
        eligibleUserCountForNextDigest: eligibleUserCount,
        activeOrTrialMemberships: activeMembershipCount,
        notificationPreferenceRows: notificationPrefRowCount,
        usersWhoDisabledEmailGlobally: notificationPrefOptedOutEmail,
        usersWhoDisabledPortfolioUpdates: notificationPrefOptedOutPortfolio,
      },
      assignments: {
        totalRows: systemAssignmentTotal,
        // Default-all opt-out semantics: rows are now mostly relevant only
        // when isActive=false. Total count is shown for sanity-checking.
      },
      perSystem,
      ingest: {
        totalRows: systemSignalIngestTotal,
      },
      emailOutbox: {
        byStatus: outboxStatuses,
        systemSignalRowsTotal: systemSignalEmailRowsTotal,
        systemSignalRowsLast7d: systemSignalEmailRowsRecent,
        lastSentSignalEmail,
        stuckQueuedWithErrors: stuckOutboxRows,
        lastFailedRow: lastFailedOutboxRow,
      },
      env: {
        EMAIL_SERVER_set: !!process.env.EMAIL_SERVER,
        EMAIL_FROM_set: !!process.env.EMAIL_FROM,
        VERCEL_CRON_SECRET_set: !!process.env.VERCEL_CRON_SECRET,
        CRON_SECRET_set: !!process.env.CRON_SECRET,
        INTERNAL_DISPATCH_SECRET_set: !!process.env.INTERNAL_DISPATCH_SECRET,
        NEXTAUTH_SECRET_set: !!process.env.NEXTAUTH_SECRET,
        DASHBOARD_SNAPSHOT_URL_set: !!process.env.DASHBOARD_SNAPSHOT_URL,
        NODE_ENV: process.env.NODE_ENV ?? null,
        VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error(
      'Signal pipeline diagnose failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Diagnose failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

function summarizeSignal(
  signalType: string | null,
  data: Record<string, unknown> | null
): string | null {
  if (!data) return null
  if (signalType === 'rotation') {
    const dom = typeof data.dominant_asset === 'string' ? data.dominant_asset : '?'
    const date = typeof data.rotation_date === 'string' ? data.rotation_date : '?'
    const from = typeof data.from_asset === 'string' ? data.from_asset : '?'
    const to = typeof data.to_asset === 'string' ? data.to_asset : '?'
    return `dominant=${dom} date=${date} ${from}→${to}`
  }
  if (signalType === 'zone_action') {
    const zone = typeof data.zone === 'string' ? data.zone : '?'
    const action = typeof data.action === 'string' ? data.action : '?'
    return `zone=${zone} action=${action}`
  }
  return null
}
// Suppress unused-import warnings
void Prisma

// ─── Manual trigger (admin-session-gated) ───────────────────────────────────
//
// POST /api/admin/systems/diagnose
//   ?action=run-bridge    → fire signal-bridge inline, return per-system outcomes
//   ?action=drain-outbox  → drain EmailOutbox once, return processed counts
//   ?action=run-all       → run bridge then drain outbox
//
// Same admin session that loads the GET diagnostic can fire these — no need
// for VERCEL_CRON_SECRET or INTERNAL_DISPATCH_SECRET to be passed through
// the browser. Useful when the scheduled cron hasn't fired or you want to
// force-test the pipeline end-to-end.

type BridgeOutcome = {
  system: string
  changed: boolean
  reason: string
  ingestId?: string
  ok?: boolean
  error?: string
}

async function runBridgeInline() {
  let snapshot
  try {
    snapshot = await getDashboardSnapshot({ fresh: true })
  } catch (error) {
    return {
      ok: false,
      stage: 'getDashboardSnapshot',
      error: error instanceof Error ? error.message : String(error),
      outcomes: [] as BridgeOutcome[],
      emailsQueued: 0,
    }
  }

  const systems = getActiveSystems()
  const outcomes: BridgeOutcome[] = []
  const changedPayloads: IngestPayload[] = []

  for (const sys of systems) {
    try {
      const detection = await detectChange(sys, snapshot)
      if (!detection.changed || !detection.payload) {
        outcomes.push({ system: sys.slug, changed: false, reason: detection.reason })
        continue
      }
      const result = await processSignalIngest(detection.payload, 'cron')
      if (!result.ok) {
        outcomes.push({
          system: sys.slug,
          changed: false,
          reason: detection.reason,
          ok: false,
          error: result.error,
        })
        continue
      }
      changedPayloads.push(detection.payload)
      outcomes.push({
        system: sys.slug,
        changed: true,
        reason: detection.reason,
        ingestId: result.ingestId,
        ok: true,
      })
    } catch (error) {
      outcomes.push({
        system: sys.slug,
        changed: false,
        reason: `exception: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  let emailsQueued = 0
  if (changedPayloads.length > 0) {
    const digestSignals = changedPayloads
      .map((p) => {
        const sys = getActiveSystems().find((s) => s.slug === p.system)
        if (!sys) return null
        return buildDigestSignal(sys, p, buildSignalText(p), commentaryFor(p))
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    try {
      emailsQueued = await queueDigestEmails({
        signals: digestSignals,
        signalDateStr: dayKey(new Date()),
      })
    } catch (error) {
      return {
        ok: false,
        stage: 'queueDigestEmails',
        error: error instanceof Error ? error.message : String(error),
        outcomes,
        emailsQueued: 0,
        snapshotTimestamp: snapshot.timestamp,
      }
    }
  }

  return {
    ok: true,
    snapshotTimestamp: snapshot.timestamp,
    systemsChecked: outcomes.length,
    signalsDetected: outcomes.filter((o) => o.changed).length,
    emailsQueued,
    outcomes,
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const action = request.nextUrl.searchParams.get('action') ?? 'run-all'

    let bridgeResult: Awaited<ReturnType<typeof runBridgeInline>> | null = null
    let outboxResult: Awaited<ReturnType<typeof processEmailOutboxBatch>> | null = null

    if (action === 'run-bridge' || action === 'run-all') {
      bridgeResult = await runBridgeInline()
    }
    if (action === 'drain-outbox' || action === 'run-all') {
      try {
        outboxResult = await processEmailOutboxBatch({ limit: 50 })
      } catch (error) {
        outboxResult = {
          processed: 0,
          sent: 0,
          failed: 0,
          queued: 0,
          // @ts-expect-error — surface error string in response
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }

    return NextResponse.json({
      action,
      bridgeResult,
      outboxResult,
    })
  } catch (error) {
    if (error instanceof Response) return error
    logger.error(
      'Signal pipeline manual trigger failed',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      {
        error: 'Manual trigger failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
