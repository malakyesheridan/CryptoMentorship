import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'
import { buildWelcomeTrialEmail } from '@/lib/templates/welcome-trial'
import { buildWelcomeEmail } from '@/lib/templates/welcome'
import { Prisma, EmailOutboxStatus, EmailType } from '@prisma/client'

export type EnqueueEmailInput = {
  type: EmailType
  toEmail: string
  userId?: string | null
  payload: Prisma.JsonObject
  scheduledFor?: Date
  idempotencyKey: string
}

export type EnqueueEmailResult = {
  queued: boolean
  id?: string
  reason?: 'duplicate' | 'error'
}

export async function enqueueEmail(input: EnqueueEmailInput): Promise<EnqueueEmailResult> {
  try {
    const record = await prisma.emailOutbox.create({
      data: {
        userId: input.userId ?? null,
        toEmail: input.toEmail,
        type: input.type,
        payload: input.payload,
        scheduledFor: input.scheduledFor ?? new Date(),
        idempotencyKey: input.idempotencyKey,
        status: EmailOutboxStatus.QUEUED,
      }
    })

    logger.info('Email enqueued', {
      emailOutboxId: record.id,
      type: input.type,
      userId: input.userId,
      toEmail: input.toEmail,
    })

    // Fire-and-forget processing to avoid relying solely on cron
    queueMicrotask(() => {
      processEmailOutboxBatch({ limit: 5 }).catch((error) => {
        logger.error(
          'Email outbox eager processing failed',
          error instanceof Error ? error : new Error(String(error))
        )
      })
    })

    return { queued: true, id: record.id }
  } catch (error: any) {
    if (error?.code === 'P2002') {
      logger.info('Email enqueue skipped (idempotent duplicate)', {
        idempotencyKey: input.idempotencyKey,
        type: input.type,
        userId: input.userId,
      })
      return { queued: false, reason: 'duplicate' }
    }
    logger.error(
      'Failed to enqueue email',
      error instanceof Error ? error : new Error(String(error)),
      { type: input.type, userId: input.userId, idempotencyKey: input.idempotencyKey }
    )
    return { queued: false, reason: 'error' }
  }
}

function computeNextScheduledFor(attempts: number): Date {
  if (attempts <= 1) {
    return new Date(Date.now() + 5 * 60 * 1000)
  }
  if (attempts === 2) {
    return new Date(Date.now() + 30 * 60 * 1000)
  }
  // attempts 3 and 4 -> 2 hours
  return new Date(Date.now() + 2 * 60 * 60 * 1000)
}

async function sendOutboxEmail(entry: { type: EmailType; toEmail: string; payload: Prisma.JsonObject }) {
  switch (entry.type) {
    case EmailType.WELCOME: {
      const payload = entry.payload as unknown as {
        firstName?: string | null
        primaryCTAUrl: string
        supportUrl?: string
      }
      const message = buildWelcomeEmail({
        firstName: payload.firstName,
        primaryCTAUrl: payload.primaryCTAUrl,
        supportUrl: payload.supportUrl,
      })
      await sendEmail({
        to: entry.toEmail,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })
      return
    }
    case EmailType.WELCOME_TRIAL: {
      const payload = entry.payload as unknown as {
        firstName?: string | null
        trialEndDate: string
        primaryCTAUrl: string
        supportUrl?: string
      }
      const message = buildWelcomeTrialEmail({
        firstName: payload.firstName,
        trialEndDate: payload.trialEndDate,
        primaryCTAUrl: payload.primaryCTAUrl,
        supportUrl: payload.supportUrl,
      })
      await sendEmail({
        to: entry.toEmail,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })
      return
    }
    default:
      throw new Error(`Unhandled email type: ${entry.type}`)
  }
}

export async function processEmailOutboxBatch({ limit = 25 }: { limit?: number } = {}) {
  type EmailOutboxRow = {
    id: string
    userId: string | null
    toEmail: string
    type: EmailType
    payload: Prisma.JsonValue
    status: EmailOutboxStatus
    attempts: number
    scheduledFor: Date
    sentAt: Date | null
  }

  const claimed = await prisma.$queryRaw<EmailOutboxRow[]>(Prisma.sql`
    UPDATE "EmailOutbox"
    SET "status" = ${EmailOutboxStatus.SENDING},
        "updatedAt" = NOW()
    WHERE "id" IN (
      SELECT "id"
      FROM "EmailOutbox"
      WHERE "status" = ${EmailOutboxStatus.QUEUED}
        AND "scheduledFor" <= NOW()
      ORDER BY "scheduledFor" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING *
  `)

  let sent = 0
  let failed = 0

  if (claimed.length === 0) {
    return { processed: 0, sent: 0, failed: 0, queued: 0 }
  }

  for (const entry of claimed) {
    try {
      await sendOutboxEmail({
        type: entry.type,
        toEmail: entry.toEmail,
        payload: entry.payload as Prisma.JsonObject,
      })

      await prisma.$transaction([
        prisma.emailOutbox.update({
          where: { id: entry.id },
          data: {
            status: EmailOutboxStatus.SENT,
            sentAt: new Date(),
            lastError: null,
          }
        }),
        prisma.emailLog.create({
          data: {
            userId: entry.userId,
            toEmail: entry.toEmail,
            type: entry.type,
            sentAt: new Date(),
            providerMessageId: null,
          }
        })
      ])

      sent += 1
    } catch (error) {
      failed += 1
      const attempts = entry.attempts + 1
      const shouldFail = attempts >= 5
      const nextStatus = shouldFail ? EmailOutboxStatus.FAILED : EmailOutboxStatus.QUEUED
      const nextSchedule = shouldFail ? entry.scheduledFor : computeNextScheduledFor(attempts)
      const lastError = error instanceof Error ? error.message : String(error)

      await prisma.emailOutbox.update({
        where: { id: entry.id },
        data: {
          attempts,
          status: nextStatus,
          scheduledFor: nextSchedule,
          lastError: lastError,
        }
      })

      logger.error('Email outbox send failed', error instanceof Error ? error : new Error(String(error)), {
        emailOutboxId: entry.id,
        attempts,
        status: nextStatus,
      })
    }
  }

  return { processed: claimed.length, sent, failed, queued: claimed.length }
}

