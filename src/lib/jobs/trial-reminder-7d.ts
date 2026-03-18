import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { sendTrialReminderDigestEmail } from '@/lib/email'

const REMINDER_TYPE = 'TRIAL_7_DAYS_LEFT'
const JOB_LOCK_SCOPE = 'TRIAL_REMINDER_7D_DIGEST'
const JOB_LOCK_TTL_MS = 30 * 60 * 1000

type JobContext = {
  runId: string
  trigger: string
  targetDateKey: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toDateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10)
}

function buildAppUrl() {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL
  if (publicUrl && publicUrl.startsWith('http')) {
    return publicUrl.replace(/\/$/, '')
  }
  return env.NEXTAUTH_URL.replace(/\/$/, '')
}

function computeWindow(now: Date) {
  const base = startOfUtcDay(now)
  const target = addDays(base, 7)
  return {
    targetDateKey: toDateKey(target),
    start: target,
    end: endOfUtcDay(target)
  }
}

function isMissingRoiSnapshotTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const prismaError = error as { code?: string; message?: string }
  const message = prismaError.message || ''

  return message.includes('RoiDashboardSnapshot')
    && (prismaError.code === 'P2021' || message.toLowerCase().includes('does not exist'))
}

async function sendDigestWithRetry(input: {
  entries: Array<{
    membershipId: string
    userId: string
    name: string | null
    email: string
    tier: string
    trialEnd: Date
    joinedAt: Date
  }>
  totalCount: number
  runDate: string
  appUrl: string
}) {
  const maxAttempts = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sendTrialReminderDigestEmail(input)
      return attempt
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      lastError = normalizedError
      logger.warn('Trial reminder digest email send attempt failed', {
        attempt,
        maxAttempts,
        runDate: input.runDate,
        error: normalizedError.message,
      })

      if (attempt < maxAttempts) {
        await sleep(attempt * 1000)
      }
    }
  }

  throw lastError || new Error('Trial reminder digest email failed after retries')
}

async function acquireDigestLock(context: JobContext) {
  const now = new Date()
  const holder = process.env.VERCEL_REGION || process.env.HOSTNAME || 'local'
  const payload = {
    runId: context.runId,
    trigger: context.trigger,
    targetDate: context.targetDateKey,
    holder,
    status: 'running',
    lockedAt: now.toISOString()
  }

  try {
    await prisma.roiDashboardSnapshot.create({
      data: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: context.targetDateKey,
        cacheKey: context.targetDateKey,
        payload: JSON.stringify(payload)
      }
    })
    logger.info('Trial reminder digest lock acquired', {
      runId: context.runId,
      trigger: context.trigger,
      targetDate: context.targetDateKey,
      holder
    })
    return { acquired: true }
  } catch (error: any) {
    if (isMissingRoiSnapshotTableError(error)) {
      logger.warn('Trial reminder digest lock table unavailable; continuing without lock', {
        runId: context.runId,
        targetDate: context.targetDateKey,
        reason: 'RoiDashboardSnapshot table missing',
      })
      return { acquired: true, reason: 'lockless' as const }
    }

    if (error?.code !== 'P2002') {
      logger.error('Failed to acquire trial reminder digest lock', error instanceof Error ? error : new Error(String(error)))
      return { acquired: false, reason: 'error' }
    }
  }

  const existing = await prisma.roiDashboardSnapshot.findUnique({
    where: {
      scope_portfolioKey: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: context.targetDateKey
      }
    }
  })
  const existingPayload = existing?.payload ? JSON.parse(existing.payload) as Record<string, any> : null
  const existingStatus = typeof existingPayload?.status === 'string' ? existingPayload.status : null
  const existingRunId = existingPayload?.runId ?? 'unknown'
  const existingHolder = existingPayload?.holder ?? 'unknown'
  const existingLockedAt = existingPayload?.lockedAt ?? null

  if (existingStatus === 'sent') {
    logger.info('Trial reminder digest already sent', {
      runId: context.runId,
      targetDate: context.targetDateKey,
      previousRunId: existingRunId
    })
    return { acquired: false, reason: 'sent' }
  }

  const staleBefore = new Date(now.getTime() - JOB_LOCK_TTL_MS)
  if (existing && existing.updatedAt < staleBefore) {
    await prisma.roiDashboardSnapshot.update({
      where: { id: existing.id },
      data: {
        payload: JSON.stringify({ ...payload, stolen: true, previousRunId: existingRunId })
      }
    })
    logger.warn('Trial reminder digest lock was stale and has been stolen', {
      runId: context.runId,
      previousRunId: existingRunId,
      previousHolder: existingHolder,
      previousLockedAt: existingLockedAt
    })
    return { acquired: true }
  }

  logger.warn('Trial reminder digest lock is currently held', {
    runId: context.runId,
    currentRunId: existingRunId,
    currentHolder: existingHolder,
    lockedAt: existingLockedAt
  })
  return { acquired: false, reason: 'locked' }
}

async function updateDigestStatus(params: {
  targetDateKey: string
  payload: Record<string, unknown>
}) {
  try {
    await prisma.roiDashboardSnapshot.update({
      where: {
        scope_portfolioKey: {
          scope: JOB_LOCK_SCOPE,
          portfolioKey: params.targetDateKey
        }
      },
      data: {
        payload: JSON.stringify(params.payload)
      }
    })
  } catch (error) {
    if (isMissingRoiSnapshotTableError(error)) {
      logger.warn('Skipping trial reminder digest status update because lock table is unavailable', {
        targetDate: params.targetDateKey,
      })
      return
    }
    throw error
  }
}

export async function runTrialReminder7DayDigest(options: { trigger?: string; now?: Date } = {}) {
  const now = options.now ?? new Date()
  const window = computeWindow(now)
  const context: JobContext = {
    runId: randomUUID(),
    trigger: options.trigger ?? 'cron',
    targetDateKey: window.targetDateKey
  }

  logger.info('Trial reminder digest job starting', {
    runId: context.runId,
    trigger: context.trigger,
    targetDate: window.targetDateKey,
    windowStart: window.start.toISOString(),
    windowEnd: window.end.toISOString()
  })

  const lock = await acquireDigestLock(context)
  if (!lock.acquired) {
    return { processed: 0, skipped: lock.reason ?? 'locked', runId: context.runId }
  }

  const basePayload = {
    runId: context.runId,
    trigger: context.trigger,
    targetDate: context.targetDateKey,
    status: 'running',
    startedAt: new Date().toISOString()
  }

  try {
    const memberships = await prisma.membership.findMany({
      where: {
        status: 'trial',
        currentPeriodEnd: {
          gte: window.start,
          lte: window.end
        }
      },
      select: {
        id: true,
        userId: true,
        tier: true,
        status: true,
        currentPeriodEnd: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true
          }
        }
      }
    })

    if (memberships.length === 0) {
      await updateDigestStatus({
        targetDateKey: context.targetDateKey,
        payload: { ...basePayload, status: 'empty', found: 0, endedAt: new Date().toISOString() }
      })
      logger.info('Trial reminder digest found no matching trials', { runId: context.runId })
      return { processed: 0, found: 0, runId: context.runId }
    }

    const membershipIds = memberships.map((membership) => membership.id)
    const existingLogs = await prisma.trialReminderLog.findMany({
      where: {
        reminderType: REMINDER_TYPE,
        membershipId: { in: membershipIds },
        periodEnd: {
          gte: window.start,
          lte: window.end
        }
      },
      select: {
        membershipId: true,
        periodEnd: true
      }
    })
    const loggedKeys = new Set(existingLogs.map((log) => `${log.membershipId}:${log.periodEnd.toISOString()}`))

    const eligible = memberships.filter((membership) => {
      if (!membership.currentPeriodEnd) return false
      if (!membership.user?.email) return false
      const key = `${membership.id}:${membership.currentPeriodEnd.toISOString()}`
      return !loggedKeys.has(key)
    })

    if (eligible.length === 0) {
      await updateDigestStatus({
        targetDateKey: context.targetDateKey,
        payload: { ...basePayload, status: 'empty', found: memberships.length, endedAt: new Date().toISOString() }
      })
      logger.info('Trial reminder digest found only already-logged trials', {
        runId: context.runId,
        found: memberships.length
      })
      return { processed: 0, found: memberships.length, skippedAlreadyLogged: memberships.length, runId: context.runId }
    }

    const appUrl = buildAppUrl()
    const digestEntries = eligible.map((membership) => ({
      membershipId: membership.id,
      userId: membership.userId,
      name: membership.user?.name ?? null,
      email: membership.user?.email ?? '',
      tier: membership.tier,
      trialEnd: membership.currentPeriodEnd!,
      joinedAt: membership.user?.createdAt ?? membership.createdAt
    }))

    const emailAttempts = await sendDigestWithRetry({
      entries: digestEntries,
      totalCount: eligible.length,
      runDate: window.targetDateKey,
      appUrl
    })

    let loggedCount = 0
    let logError: string | null = null
    try {
      const logResult = await prisma.trialReminderLog.createMany({
        data: eligible.map((membership) => ({
          membershipId: membership.id,
          reminderType: REMINDER_TYPE,
          periodEnd: membership.currentPeriodEnd!,
          digestId: context.runId
        })),
        skipDuplicates: true
      })
      loggedCount = logResult.count
    } catch (error) {
      logError = error instanceof Error ? error.message : String(error)
      logger.error('Trial reminder digest log insert failed', error instanceof Error ? error : new Error(String(error)))
    }

    await updateDigestStatus({
      targetDateKey: context.targetDateKey,
      payload: {
        ...basePayload,
        status: logError ? 'sent_log_failed' : 'sent',
        found: memberships.length,
        emailed: eligible.length,
        emailAttempts,
        logged: loggedCount,
        logError,
        endedAt: new Date().toISOString()
      }
    })

    logger.info('Trial reminder digest sent', {
      runId: context.runId,
      found: memberships.length,
      emailed: eligible.length,
      emailAttempts,
    })

    return {
      processed: eligible.length,
      found: memberships.length,
      emailed: eligible.length,
      emailAttempts,
      logged: loggedCount,
      logError,
      runId: context.runId
    }
  } catch (error) {
    logger.error('Trial reminder digest failed', error instanceof Error ? error : new Error(String(error)))
    await updateDigestStatus({
      targetDateKey: context.targetDateKey,
      payload: {
        ...basePayload,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        endedAt: new Date().toISOString()
      }
    })
    throw error
  }
}
