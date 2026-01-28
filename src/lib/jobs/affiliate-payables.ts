import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { randomUUID } from 'crypto'

const JOB_LOCK_SCOPE = 'AFFILIATE_PAYABLE_JOB_LOCK'
const JOB_LOCK_KEY = 'GLOBAL'
const JOB_LOCK_TTL_MS = 30 * 60 * 1000

type JobContext = {
  runId: string
  trigger: string
}

async function acquireJobLock(context: JobContext) {
  const now = new Date()
  const holder = process.env.VERCEL_REGION || process.env.HOSTNAME || 'local'
  const payload = {
    runId: context.runId,
    trigger: context.trigger,
    holder,
    lockedAt: now.toISOString()
  }

  try {
    await prisma.roiDashboardSnapshot.create({
      data: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: JOB_LOCK_KEY,
        cacheKey: JOB_LOCK_KEY,
        payload: JSON.stringify(payload)
      }
    })
    logger.info('Affiliate payable job lock acquired', { runId: context.runId, trigger: context.trigger, holder })
    return true
  } catch (error: any) {
    if (error?.code !== 'P2002') {
      logger.error('Failed to acquire affiliate payable job lock', error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  const existing = await prisma.roiDashboardSnapshot.findUnique({
    where: {
      scope_portfolioKey: {
        scope: JOB_LOCK_SCOPE,
        portfolioKey: JOB_LOCK_KEY
      }
    }
  })
  const existingPayload = existing?.payload ? JSON.parse(existing.payload) as Record<string, any> : null
  const existingLockedAt = existingPayload?.lockedAt ?? null
  const existingRunId = existingPayload?.runId ?? 'unknown'
  const existingHolder = existingPayload?.holder ?? 'unknown'

  const staleBefore = new Date(now.getTime() - JOB_LOCK_TTL_MS)
  if (existing && existing.updatedAt < staleBefore) {
    await prisma.roiDashboardSnapshot.update({
      where: { id: existing.id },
      data: {
        payload: JSON.stringify({ ...payload, stolen: true, previousRunId: existingRunId })
      }
    })
    logger.warn('Affiliate payable job lock was stale and has been stolen', {
      runId: context.runId,
      previousRunId: existingRunId,
      previousHolder: existingHolder,
      previousLockedAt: existingLockedAt
    })
    return true
  }

  logger.warn('Affiliate payable job lock is currently held', {
    runId: context.runId,
    currentRunId: existingRunId,
    currentHolder: existingHolder,
    lockedAt: existingLockedAt
  })
  return false
}

async function releaseJobLock() {
  await prisma.roiDashboardSnapshot.deleteMany({
    where: { scope: JOB_LOCK_SCOPE, portfolioKey: JOB_LOCK_KEY }
  })
  logger.info('Affiliate payable job lock released')
}

export async function runAffiliatePayableJob(options: { trigger?: string } = {}) {
  const context: JobContext = {
    runId: randomUUID(),
    trigger: options.trigger ?? 'cron'
  }

  logger.info('Affiliate payable job starting', { runId: context.runId, trigger: context.trigger })

  const lockAcquired = await acquireJobLock(context)
  if (!lockAcquired) {
    return { processed: 0, skipped: 'locked', runId: context.runId }
  }

  try {
    const now = new Date()
    const eligible = await prisma.referral.findMany({
      where: {
        status: 'QUALIFIED',
        payableAt: { lte: now }
      },
      select: {
        id: true,
        referrerId: true,
        referredUserId: true,
        payableAt: true
      }
    })

    if (eligible.length === 0) {
      logger.info('Affiliate payable job found no eligible referrals', { runId: context.runId })
      return { processed: 0, updated: 0, runId: context.runId }
    }

    const updateResult = await prisma.referral.updateMany({
      where: { id: { in: eligible.map((r) => r.id) } },
      data: { status: 'PAYABLE' }
    })

    logger.info('Affiliate payable job updated referrals', {
      runId: context.runId,
      processed: eligible.length,
      updated: updateResult.count
    })

    return { processed: eligible.length, updated: updateResult.count, runId: context.runId }
  } finally {
    await releaseJobLock()
  }
}
