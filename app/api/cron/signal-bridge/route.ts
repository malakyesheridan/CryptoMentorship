import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getDashboardSnapshot } from '@/lib/dashboard-snapshot'
import { getActiveSystems, type SystemDefinition } from '@/lib/system-registry'
import {
  processSignalIngest,
  buildDigestSignal,
  buildSignalText,
  commentaryFor,
  queueDigestEmails,
  dayKey,
  type IngestPayload,
} from '@/lib/systems/ingest'
import { getSystem } from '@/lib/system-registry'
import type {
  DashboardSnapshot,
  DhrsSystem,
  MrsSystem,
  SdcaSystem,
} from '@/types/dashboard-snapshot'

export const dynamic = 'force-dynamic'

// ─── Auth (matches /api/cron/email-outbox) ──────────────────────────────────

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
  // Match the ingest endpoint: accept Bearer with INTERNAL_DISPATCH_SECRET
  // (in addition to the dedicated x-internal-job-token header) so manual
  // diagnostic curls work with a single auth scheme.
  if (internalDispatchSecret && (internalToken === internalDispatchSecret || bearer === internalDispatchSecret)) return true
  if (!isProduction && !cronSecret) return true
  return false
}

// ─── Change detection ───────────────────────────────────────────────────────

type StoredSignal = { signal_type?: string; data?: Record<string, unknown> } | null

async function lastIngestPayload(systemSlug: string): Promise<StoredSignal> {
  const last = await prisma.systemSignalIngest.findFirst({
    where: { systemSlug },
    orderBy: { processedAt: 'desc' },
    select: { signalData: true },
  })
  return (last?.signalData as StoredSignal) ?? null
}

function pickLatestRotation(
  rotations: DhrsSystem['recent_rotations'] | MrsSystem['recent_rotations'] | undefined
) {
  // Don't trust array order — Coen's pipeline could emit oldest-first OR
  // newest-first, and our own UI explicitly sorts via b.date.localeCompare(a.date)
  // because the source order is unstable. Pick the rotation with the
  // maximum ISO date.
  if (!rotations || rotations.length === 0) return undefined
  let best = rotations[0]
  for (let i = 1; i < rotations.length; i++) {
    const cur = rotations[i]
    if ((cur?.date ?? '') > (best?.date ?? '')) best = cur
  }
  return best
}

function rotationKey(snap: DhrsSystem | MrsSystem): string {
  // Dominant asset is the meaningful "is the signal different?" key for
  // rotation systems. Most-recent rotation date + endpoints included so a
  // fresh rotation (even back to the same asset) still triggers.
  const lastRot = pickLatestRotation(snap.recent_rotations)
  return [
    snap.dominant ?? '',
    lastRot?.date ?? '',
    lastRot?.from ?? '',
    lastRot?.to ?? '',
  ].join('|')
}

function rotationKeyFromIngest(stored: StoredSignal): string | null {
  if (!stored || stored.signal_type !== 'rotation' || !stored.data) return null
  const d = stored.data as Record<string, unknown>
  return [
    typeof d.dominant_asset === 'string' ? d.dominant_asset : '',
    typeof d.rotation_date === 'string' ? d.rotation_date : '',
    typeof d.from_asset === 'string' ? d.from_asset : '',
    typeof d.to_asset === 'string' ? d.to_asset : '',
  ].join('|')
}

function sdcaKey(snap: SdcaSystem): string {
  return `${snap.zone}|${snap.action}`
}

function sdcaKeyFromIngest(stored: StoredSignal): string | null {
  if (!stored || stored.signal_type !== 'zone_action' || !stored.data) return null
  const d = stored.data as Record<string, unknown>
  return `${typeof d.zone === 'string' ? d.zone : ''}|${typeof d.action === 'string' ? d.action : ''}`
}

// ─── Snapshot → IngestPayload mappers ───────────────────────────────────────

function todayUtc(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function mapRotation(
  systemSlug: 'dhrs' | 'mrs',
  snap: DhrsSystem | MrsSystem
): IngestPayload {
  const lastRot = pickLatestRotation(snap.recent_rotations)
  return {
    system: systemSlug,
    signal_type: 'rotation',
    data: {
      regime: snap.regime,
      dominant_asset: snap.dominant,
      from_asset: lastRot?.from,
      to_asset: lastRot?.to,
      allocation: `100% ${snap.dominant}`,
      rotation_date: lastRot?.date ?? todayUtc(),
      commentary: undefined,
    },
  }
}

function mapSdca(snap: SdcaSystem): IngestPayload {
  return {
    system: 'sdca',
    signal_type: 'zone_action',
    data: {
      zone: snap.zone,
      action: snap.action,
      composite_z: snap.composite_z,
      btc_price: snap.btc_price,
      signal_date: todayUtc(),
      commentary: undefined,
    },
  }
}

// ─── Per-system processor ───────────────────────────────────────────────────

type SystemOutcome = {
  system: string
  changed: boolean
  reason: string
  emailsQueued?: number
  ingestId?: string
}

type ChangeDetection = {
  changed: boolean
  reason: string
  payload?: IngestPayload
}

async function detectChange(
  sys: SystemDefinition,
  snapshot: DashboardSnapshot
): Promise<ChangeDetection> {
  if (sys.slug === 'dhrs') {
    const data = snapshot.dhrs
    if (!data) return { changed: false, reason: 'no snapshot data' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('dhrs', data),
    }
  }

  if (sys.slug === 'mrs') {
    const data = snapshot.mrs
    if (!data) return { changed: false, reason: 'no snapshot data (mrs not in snapshot yet)' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = rotationKeyFromIngest(last)
    const currentKey = rotationKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapRotation('mrs', data),
    }
  }

  if (sys.slug === 'sdca') {
    const data = snapshot.sdca
    if (!data) return { changed: false, reason: 'no snapshot data' }
    const last = await lastIngestPayload(sys.slug)
    const lastKey = sdcaKeyFromIngest(last)
    const currentKey = sdcaKey(data)
    if (lastKey === currentKey) {
      return { changed: false, reason: `unchanged (${currentKey})` }
    }
    return {
      changed: true,
      reason: `${lastKey ?? 'first'} → ${currentKey}`,
      payload: mapSdca(data),
    }
  }

  return {
    changed: false,
    reason: `unknown system mapping (registry has slug ${sys.slug} but the bridge has no mapper)`,
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

async function runBridge() {
  // Bypass the 5-minute fetch cache — the bridge runs at 00:45 and Coen
  // pushes at 00:30, so the page-render cache could still hold the
  // pre-push snapshot otherwise.
  const snapshot = await getDashboardSnapshot({ fresh: true })
  const systems = getActiveSystems()

  const outcomes: SystemOutcome[] = []
  // Per-system ingest writes (audit log + PortfolioDailySignal +
  // StrategyUpdate) happen with skipEmail=true so we can fan out a single
  // combined digest after every system has been processed.
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

      const result = await processSignalIngest(detection.payload, 'cron', {
        skipEmail: true,
      })
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
        // emailsQueued filled in below per-digest, not per-system
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

  // Single combined digest fan-out — one EmailOutbox row per qualifying
  // user. dedupeKey daily_signal_digest_<date>_<userId> blocks duplicates
  // across multiple bridge runs and across direct ingest pushes.
  let emailsQueued = 0
  if (changedPayloads.length > 0) {
    const digestSignals = changedPayloads
      .map((p) => {
        const sys = getSystem(p.system)
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
      logger.error(
        'Signal bridge digest email queueing failed',
        error instanceof Error ? error : new Error(String(error)),
        { changedSlugs: changedPayloads.map((p) => p.system) }
      )
    }
  }

  const summary = {
    snapshotTimestamp: snapshot.timestamp,
    systemsChecked: outcomes.length,
    signalsDetected: outcomes.filter((o) => o.changed).length,
    emailsQueued,
    outcomes,
  }

  logger.info('Signal bridge run complete', summary)
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
  // Same handler — POST allows manual on-demand triggering from admin/curl.
  return GET(request)
}
