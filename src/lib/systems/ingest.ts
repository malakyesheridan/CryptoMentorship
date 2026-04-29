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

function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function buildSignalText(payload: IngestPayload): string {
  if (payload.signal_type === 'rotation') {
    return payload.data.allocation
  }
  const action = payload.data.action.toUpperCase()
  if (typeof payload.data.allocation_pct === 'number') {
    return `${action} ${payload.data.allocation_pct}%`
  }
  return action
}

function commentaryFor(payload: IngestPayload): string | null {
  return payload.data.commentary?.trim() || null
}

// ─── Core pipeline ──────────────────────────────────────────────────────────

/**
 * The shared ingest pipeline. Used by:
 *   - POST /api/ingest/signal (Coen's Python pipeline)
 *   - GET  /api/cron/signal-bridge (auto-trigger from snapshot diff)
 *   - any future programmatic entry point
 *
 * Idempotent: same (system, day) push deletes today's existing signal and
 * inserts the new one. EmailOutbox dedupe key blocks duplicate emails for
 * the same (system, day, user).
 */
export async function processSignalIngest(
  payload: IngestPayload,
  source: IngestSource = 'api'
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

  // 4. Email queue
  let emailsQueued = 0
  try {
    emailsQueued = await queueSignalEmails({
      system,
      payload,
      signalText,
      commentary,
      signalDateStr,
    })
  } catch (error) {
    logger.error(
      'Failed to queue signal emails',
      error instanceof Error ? error : new Error(String(error)),
      { ingestId: ingestRecord.id, systemSlug: system.slug }
    )
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

// ─── Email fan-out ──────────────────────────────────────────────────────────

type QueueArgs = {
  system: SystemDefinition
  payload: IngestPayload
  signalText: string
  commentary: string | null
  signalDateStr: string
}

async function queueSignalEmails(args: QueueArgs): Promise<number> {
  const { system, payload, signalText, commentary, signalDateStr } = args
  const now = new Date()

  const assignments = await prisma.userSystemAssignment.findMany({
    where: { systemSlug: system.slug, isActive: true },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          notificationPreference: {
            select: {
              emailEnabled: true,
              portfolioUpdatesEmail: true,
            },
          },
          memberships: {
            where: {
              status: { in: ['active', 'trial'] },
              OR: [
                { currentPeriodEnd: null },
                { currentPeriodEnd: { gte: now } },
              ],
            },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  })

  const eligible = assignments
    .map((a) => a.user)
    .filter((u): u is NonNullable<typeof u> => !!u && !!u.email && u.isActive)
    .filter((u) => u.memberships.length > 0)
    .filter((u) => {
      const prefs = u.notificationPreference
      if (!prefs) return true // default: opted-in
      if (prefs.emailEnabled === false) return false
      if (prefs.portfolioUpdatesEmail === false) return false
      return true
    })

  if (eligible.length === 0) {
    logger.warn('Signal ingest queued zero emails', {
      systemSlug: system.slug,
      reason: assignments.length === 0
        ? 'no UserSystemAssignment rows for this system — backfill not run?'
        : 'all assigned users filtered out by membership/preferences',
      assignmentCount: assignments.length,
    })
    return 0
  }

  const baseUrl = getAppUrl()
  const dashboardUrl = `${baseUrl}/systems#${system.slug}`
  const preferencesUrl = `${baseUrl}/account`
  const subject = `${system.emailSubjectPrefix} — ${signalText}`

  let queued = 0
  await Promise.all(
    eligible.map(async (user) => {
      const dedupeKey = `signal_${system.slug}_${signalDateStr}_${user.id}`
      const variables: Record<string, unknown> = {
        userName: user.name,
        systemName: system.shortName,
        systemSlug: system.slug,
        signalType: payload.signal_type,
        signal: signalText,
        commentary,
        dashboardUrl,
        preferencesUrl,
      }
      if (payload.signal_type === 'rotation') {
        variables.fromAsset = payload.data.from_asset ?? null
        variables.toAsset = payload.data.to_asset ?? null
      } else {
        variables.zone = payload.data.zone
        variables.action = payload.data.action
        variables.compositeZ =
          typeof payload.data.composite_z === 'number'
            ? payload.data.composite_z
            : null
        variables.btcPrice =
          typeof payload.data.btc_price === 'number'
            ? payload.data.btc_price
            : null
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
