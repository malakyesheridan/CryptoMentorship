import { Prisma, EmailType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getAppUrl } from '@/lib/env'
import { enqueueEmail } from '@/lib/email-outbox'
import { revalidateDashboardSignals } from '@/lib/revalidate'
import {
  getSystem,
  isValidSystemSlug,
  type SystemDefinition,
} from '@/lib/system-registry'
import type { DigestSignal } from '@/lib/templates/signal-digest'

// ─── Validation schemas (shared with the HTTP route) ────────────────────────

export const rotationDataSchema = z.object({
  regime: z.boolean().optional(),
  dominant_asset: z.string().optional(),
  from_asset: z.string().optional(),
  to_asset: z.string().optional(),
  allocation: z.string().min(1, 'allocation is required'),
  entry_price: z.number().optional(),
  rotation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'rotation_date must be YYYY-MM-DD')
    .optional(),
  commentary: z.string().optional(),
})

export const zoneActionDataSchema = z.object({
  zone: z.string().min(1, 'zone is required'),
  action: z.string().min(1, 'action is required'),
  composite_z: z.number().optional(),
  btc_price: z.number().optional(),
  allocation_pct: z.number().min(0).max(100).optional(),
  signal_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'signal_date must be YYYY-MM-DD')
    .optional(),
  commentary: z.string().optional(),
})

export const ingestSchema = z.discriminatedUnion('signal_type', [
  z.object({
    system: z.string().min(1),
    signal_type: z.literal('rotation'),
    data: rotationDataSchema,
  }),
  z.object({
    system: z.string().min(1),
    signal_type: z.literal('zone_action'),
    data: zoneActionDataSchema,
  }),
])

export type IngestPayload = z.infer<typeof ingestSchema>
export type IngestSource = 'api' | 'cron' | 'manual'

export type IngestSuccess = {
  ok: true
  ingestId: string
  system: string
  signal: string
  portfolioSignalId: string | null
  emailsQueued: number
}

export type IngestFailure = {
  ok: false
  status: number
  error: string
  details?: unknown
}

export type IngestResult = IngestSuccess | IngestFailure

// ─── Helpers ────────────────────────────────────────────────────────────────

function utcDayBounds(date: Date) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  )
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function buildSignalText(payload: IngestPayload): string {
  if (payload.signal_type === 'rotation') {
    return payload.data.allocation
  }
  const action = payload.data.action.toUpperCase()
  if (typeof payload.data.allocation_pct === 'number') {
    return `${action} ${payload.data.allocation_pct}%`
  }
  return action
}

export function commentaryFor(payload: IngestPayload): string | null {
  return payload.data.commentary?.trim() || null
}

// ─── Core pipeline ──────────────────────────────────────────────────────────

export type ProcessOptions = {
  /**
   * Skip the per-system email fan-out at the end of the pipeline. The
   * signal-bridge cron uses this to collect all changed signals first and
   * then send a single combined digest email per user, instead of N emails.
   */
  skipEmail?: boolean
}

/**
 * The shared ingest pipeline. Used by:
 *   - POST /api/ingest/signal (Coen's Python pipeline) — skipEmail=false,
 *     queues a single-signal digest for the user.
 *   - GET  /api/cron/signal-bridge — calls per-system with skipEmail=true,
 *     then fans out one combined digest per user.
 *
 * Idempotent: same (system, day) push deletes today's existing signal and
 * inserts the new one. The digest dedupeKey (`daily_signal_digest_<date>_<user>`)
 * blocks duplicate emails on the same day regardless of which path queued
 * the row first.
 */
export async function processSignalIngest(
  payload: IngestPayload,
  source: IngestSource = 'api',
  options: ProcessOptions = {}
): Promise<IngestResult> {
  const system = getSystem(payload.system)
  if (!system || !system.isActive || !isValidSystemSlug(payload.system)) {
    return {
      ok: false,
      status: 400,
      error: `Unknown or inactive system: ${payload.system}`,
    }
  }

  if (system.signalFormat !== payload.signal_type) {
    return {
      ok: false,
      status: 400,
      error: `signal_type "${payload.signal_type}" does not match system ${system.slug} (expects "${system.signalFormat}")`,
    }
  }

  const now = new Date()
  const signalDateStr =
    (payload.signal_type === 'rotation'
      ? payload.data.rotation_date
      : payload.data.signal_date) || dayKey(now)

  // 1. Audit log
  let ingestRecord
  try {
    ingestRecord = await prisma.systemSignalIngest.create({
      data: {
        systemSlug: system.slug,
        signalData: payload as unknown as Prisma.InputJsonValue,
        source,
      },
    })
  } catch (error) {
    logger.error(
      'Failed to write SystemSignalIngest log',
      error instanceof Error ? error : new Error(String(error))
    )
    return { ok: false, status: 500, error: 'Failed to log signal ingest' }
  }

  const signalText = buildSignalText(payload)
  const commentary = commentaryFor(payload)

  // 2. PortfolioDailySignal (replace today's row for this system)
  const { start, end } = utcDayBounds(now)
  let portfolioSignalId: string | null = null
  let portfolioUpdated = false
  try {
    const associated = {
      systemSlug: system.slug,
      systemName: system.shortName,
      signalType: payload.signal_type,
      data: payload.data,
    }

    await prisma.portfolioDailySignal.deleteMany({
      where: {
        category: system.slug,
        publishedAt: { gte: start, lt: end },
      },
    })

    const created = await prisma.portfolioDailySignal.create({
      data: {
        tier: 'T2',
        category: system.slug,
        riskProfile: 'AGGRESSIVE',
        signal: signalText,
        executiveSummary: commentary,
        associatedData: JSON.stringify(associated),
        publishedAt: now,
      },
    })
    portfolioSignalId = created.id
    portfolioUpdated = true
  } catch (error) {
    logger.error(
      'Failed to upsert PortfolioDailySignal from ingest',
      error instanceof Error ? error : new Error(String(error)),
      { ingestId: ingestRecord.id, systemSlug: system.slug }
    )
    await prisma.systemSignalIngest.update({
      where: { id: ingestRecord.id },
      data: { error: error instanceof Error ? error.message : String(error) },
    })
    return { ok: false, status: 500, error: 'Failed to write portfolio signal' }
  }

  // 3. StrategyUpdate (if a Strategy row exists for this slug — non-fatal)
  try {
    const strategy = await prisma.strategy.findUnique({
      where: { slug: system.slug },
      select: { id: true },
    })
    if (strategy) {
      await prisma.strategyUpdate.create({
        data: {
          strategyId: strategy.id,
          date: now,
          updateType:
            payload.signal_type === 'rotation' ? 'rotation' : 'sdca_buy',
          toState: JSON.stringify(payload.data),
          commentaryText: commentary,
          notify: true,
        },
      })
    }
  } catch (error) {
    logger.warn('Strategy mirror failed during signal ingest', {
      ingestId: ingestRecord.id,
      systemSlug: system.slug,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // 4. Email queue (single-signal digest unless caller asks us to skip)
  let emailsQueued = 0
  if (!options.skipEmail) {
    try {
      const digestSignal = buildDigestSignal(system, payload, signalText, commentary)
      emailsQueued = await queueDigestEmails({
        signals: [digestSignal],
        signalDateStr,
      })
    } catch (error) {
      logger.error(
        'Failed to queue signal emails',
        error instanceof Error ? error : new Error(String(error)),
        { ingestId: ingestRecord.id, systemSlug: system.slug }
      )
    }
  }

  // 5. Update audit log with results
  await prisma.systemSignalIngest.update({
    where: { id: ingestRecord.id },
    data: { emailsQueued, portfolioUpdated },
  })

  // 6. Cache bust (non-fatal)
  try {
    await revalidateDashboardSignals()
  } catch {
    // ignore
  }

  return {
    ok: true,
    ingestId: ingestRecord.id,
    system: system.slug,
    signal: signalText,
    portfolioSignalId,
    emailsQueued,
  }
}

// ─── Email fan-out (digest format, opt-out semantics) ──────────────────────

/**
 * Convert an ingest payload into the per-signal payload the digest email
 * template expects. Pure mapping, no I/O.
 */
export function buildDigestSignal(
  system: SystemDefinition,
  payload: IngestPayload,
  signalText: string,
  commentary: string | null
): DigestSignal {
  const base: DigestSignal = {
    systemName: system.shortName,
    systemSlug: system.slug,
    signalType: payload.signal_type,
    signal: signalText,
    commentary: commentary ?? null,
    color: system.color,
  }
  if (payload.signal_type === 'rotation') {
    base.fromAsset = payload.data.from_asset ?? null
    base.toAsset = payload.data.to_asset ?? null
  } else {
    base.zone = payload.data.zone ?? null
    base.action = payload.data.action ?? null
    base.compositeZ =
      typeof payload.data.composite_z === 'number' ? payload.data.composite_z : null
    base.btcPrice =
      typeof payload.data.btc_price === 'number' ? payload.data.btc_price : null
  }
  return base
}

type EmailRecipient = {
  id: string
  email: string
  name: string | null
}

/**
 * Resolve the set of users who should receive a digest email today.
 *
 * Default-all opt-out semantics:
 *   - Start: every user with an active or trial membership and email
 *     notifications enabled (or no preference row, defaulting to enabled).
 *   - Subtract: users who have UserSystemAssignment rows with isActive=false
 *     for EVERY signal in today's digest (i.e., they've explicitly opted
 *     out of every system that's updating today).
 *
 * Per-user signal filtering (removing one system the user opted out of
 * while keeping the others) is handled by the caller via `filterSignalsFor`.
 */
async function resolveDigestRecipients(
  signalSlugs: string[]
): Promise<{ user: EmailRecipient; optOuts: Set<string> }[]> {
  const now = new Date()

  // Pull all opt-out rows for the systems involved in this digest.
  const optOuts = await prisma.userSystemAssignment.findMany({
    where: {
      isActive: false,
      systemSlug: { in: signalSlugs },
    },
    select: { userId: true, systemSlug: true },
  })
  const optOutsByUser = new Map<string, Set<string>>()
  for (const row of optOuts) {
    const set = optOutsByUser.get(row.userId) ?? new Set<string>()
    set.add(row.systemSlug)
    optOutsByUser.set(row.userId, set)
  }

  const users = await prisma.user.findMany({
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
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreference: {
        select: {
          emailEnabled: true,
          portfolioUpdatesEmail: true,
        },
      },
    },
  })

  return users
    .filter((u) => !!u.email)
    .filter((u) => {
      const prefs = u.notificationPreference
      if (!prefs) return true // default opted-in
      if (prefs.emailEnabled === false) return false
      if (prefs.portfolioUpdatesEmail === false) return false
      return true
    })
    .map((u) => ({
      user: { id: u.id, email: u.email, name: u.name },
      optOuts: optOutsByUser.get(u.id) ?? new Set<string>(),
    }))
}

/**
 * Queue one digest email per qualifying user. Each user's digest contains
 * only the signals they haven't opted out of. Users who've opted out of
 * every system in the digest are skipped entirely.
 *
 * dedupeKey = `daily_signal_digest_<YYYY-MM-DD>_<userId>` ensures one email
 * per user per day across all paths (HTTP ingest + bridge cron). Whichever
 * path fires first wins.
 */
export async function queueDigestEmails(args: {
  signals: DigestSignal[]
  signalDateStr: string
}): Promise<number> {
  const { signals, signalDateStr } = args
  if (signals.length === 0) return 0

  const slugs = signals.map((s) => s.systemSlug)
  const recipients = await resolveDigestRecipients(slugs)
  if (recipients.length === 0) {
    logger.warn('Signal digest queued zero recipients', {
      reason: 'no users with active membership + email preferences enabled',
      signalSlugs: slugs,
    })
    return 0
  }

  const baseUrl = getAppUrl()
  const dashboardUrl = `${baseUrl}/systems`
  const preferencesUrl = `${baseUrl}/account`
  const subject =
    signals.length > 1
      ? `Stewart & Co — Daily Signal Update (${signals.length} systems)`
      : 'Stewart & Co — Daily Signal Update'

  let queued = 0
  await Promise.all(
    recipients.map(async ({ user, optOuts }) => {
      const userSignals = signals.filter((s) => !optOuts.has(s.systemSlug))
      if (userSignals.length === 0) return // user opted out of every signal in this digest

      const dedupeKey = `daily_signal_digest_${signalDateStr}_${user.id}`
      const variables: Record<string, unknown> = {
        userName: user.name,
        signals: userSignals,
        date: signalDateStr,
        dashboardUrl,
        preferencesUrl,
      }

      const result = await enqueueEmail({
        type: EmailType.NOTIFICATION_SYSTEM_SIGNAL,
        toEmail: user.email,
        userId: user.id,
        payload: {
          subject,
          templateKey: 'system_signal',
          variables: variables as Prisma.JsonObject,
        } as Prisma.JsonObject,
        idempotencyKey: dedupeKey,
        scheduledFor: new Date(),
      })
      if (result.queued) queued += 1
    })
  )

  return queued
}
