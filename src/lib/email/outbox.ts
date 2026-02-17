import { Prisma, EmailOutboxStatus, EmailType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'
import { sendDailySignalEmail } from '@/lib/email-templates'
import { buildWelcomeTrialEmail } from '@/lib/templates/welcome-trial'
import { buildWelcomeEmail } from '@/lib/templates/welcome'
import type { NotificationEmailType } from '@/lib/notifications/types'

function resolveCronUrl(): string | null {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL || ''
  if (!baseUrl) return null
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`
  }
  return new URL('/api/cron/email-outbox', baseUrl.replace(/\/$/, '')).toString()
}

function triggerOutboxProcessing() {
  const cronUrl = resolveCronUrl()
  if (!cronUrl) return

  const cronSecret = process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET
  const internalDispatchSecret = process.env.INTERNAL_DISPATCH_SECRET || process.env.NEXTAUTH_SECRET
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (cronSecret) {
    headers.authorization = `Bearer ${cronSecret}`
  }
  if (internalDispatchSecret) {
    headers['x-internal-job-token'] = internalDispatchSecret
  }

  fetch(cronUrl, {
    method: 'POST',
    keepalive: true,
    headers,
  }).catch((error) => {
    logger.error(
      'Failed to trigger email outbox processing',
      error instanceof Error ? error : new Error(String(error))
    )
  })
}

type LegacyEnqueueEmailInput = {
  type: EmailType
  toEmail: string
  userId?: string | null
  payload: Prisma.JsonObject
  scheduledFor?: Date
  idempotencyKey: string
}

export type EnqueueEmailInput = {
  to: string
  templateKey: NotificationEmailType
  subject: string
  variables: Record<string, unknown>
  dedupeKey: string
  userId?: string | null
  scheduledFor?: Date
}

export type EnqueueEmailResult = {
  queued: boolean
  id?: string
  reason?: 'duplicate' | 'error'
}

const templateKeyToEmailType: Record<NotificationEmailType, EmailType> = {
  portfolio_update: EmailType.NOTIFICATION_PORTFOLIO_UPDATE,
  crypto_compass: EmailType.NOTIFICATION_CRYPTO_COMPASS,
  learning_hub: EmailType.NOTIFICATION_LEARNING_HUB,
  community_mention: EmailType.NOTIFICATION_COMMUNITY_MENTION,
  community_reply: EmailType.NOTIFICATION_COMMUNITY_REPLY,
}

function isMissingEmailTypeEnum(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const message = (error as { message?: string }).message
  if (!message || typeof message !== 'string') return false
  return message.includes('invalid input value for enum') && message.includes('EmailType')
}

function toLegacyInput(input: EnqueueEmailInput): LegacyEnqueueEmailInput {
  return {
    type: templateKeyToEmailType[input.templateKey],
    toEmail: input.to,
    userId: input.userId ?? null,
    payload: {
      templateKey: input.templateKey,
      subject: input.subject,
      variables: input.variables as Prisma.JsonObject,
    },
    scheduledFor: input.scheduledFor,
    idempotencyKey: input.dedupeKey,
  }
}

async function createOutboxRecord(input: LegacyEnqueueEmailInput, typeOverride?: EmailType) {
  const dedupeKey = input.idempotencyKey
  return prisma.emailOutbox.create({
    data: {
      userId: input.userId ?? null,
      toEmail: input.toEmail,
      type: typeOverride ?? input.type,
      payload: input.payload,
      scheduledFor: input.scheduledFor ?? new Date(),
      idempotencyKey: input.idempotencyKey,
      dedupeKey,
      status: EmailOutboxStatus.QUEUED,
    },
  })
}

function finalizeEnqueue(
  record: { id: string },
  input: LegacyEnqueueEmailInput,
  actualType: EmailType = input.type
) {
  logger.info('Email enqueued', {
    emailOutboxId: record.id,
    type: actualType,
    userId: input.userId,
    toEmail: input.toEmail,
  })
  triggerOutboxProcessing()
  return { queued: true as const, id: record.id }
}

export async function enqueueEmail(input: EnqueueEmailInput | LegacyEnqueueEmailInput): Promise<EnqueueEmailResult> {
  const normalized = 'templateKey' in input ? toLegacyInput(input) : input

  try {
    const record = await createOutboxRecord(normalized)
    return finalizeEnqueue(record, normalized, normalized.type)
  } catch (error: any) {
    if (isMissingEmailTypeEnum(error) && normalized.type === EmailType.WELCOME) {
      try {
        const record = await createOutboxRecord(normalized, EmailType.WELCOME_TRIAL)
        logger.warn('Email type WELCOME not available - falling back to WELCOME_TRIAL', {
          emailOutboxId: record.id,
          userId: normalized.userId,
          toEmail: normalized.toEmail,
        })
        return finalizeEnqueue(record, normalized, EmailType.WELCOME_TRIAL)
      } catch (fallbackError) {
        logger.error(
          'Failed to enqueue email after fallback to WELCOME_TRIAL',
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
          { type: normalized.type, userId: normalized.userId, idempotencyKey: normalized.idempotencyKey }
        )
        return { queued: false, reason: 'error' }
      }
    }

    if (error?.code === 'P2002') {
      logger.info('Email enqueue skipped (idempotent duplicate)', {
        dedupeKey: normalized.idempotencyKey,
        type: normalized.type,
        userId: normalized.userId,
      })
      triggerOutboxProcessing()
      return { queued: false, reason: 'duplicate' }
    }

    logger.error(
      'Failed to enqueue email',
      error instanceof Error ? error : new Error(String(error)),
      { type: normalized.type, userId: normalized.userId, idempotencyKey: normalized.idempotencyKey }
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
  return new Date(Date.now() + 2 * 60 * 60 * 1000)
}

type NotificationPayloadEnvelope = {
  subject?: string
  templateKey?: string
  variables?: Record<string, unknown>
}

function parseNotificationPayload(payload: Prisma.JsonObject): NotificationPayloadEnvelope {
  if ('variables' in payload && typeof payload.variables === 'object' && payload.variables !== null) {
    return payload as NotificationPayloadEnvelope
  }
  return {
    variables: payload as Record<string, unknown>,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderSimpleNotificationEmail(args: {
  subject: string
  heading: string
  intro: string
  ctaLabel: string
  ctaUrl?: string | null
  footerUrl?: string | null
}) {
  const safeHeading = escapeHtml(args.heading)
  const safeIntro = escapeHtml(args.intro)
  const safeCtaLabel = escapeHtml(args.ctaLabel)

  const cta = args.ctaUrl
    ? `<p style="margin-top: 24px;"><a href="${args.ctaUrl}" style="color: #2563eb;">${safeCtaLabel}</a></p>`
    : ''
  const footer = args.footerUrl
    ? `<p style="margin-top: 24px; font-size: 13px; color: #64748b;">Manage preferences: <a href="${args.footerUrl}" style="color: #2563eb;">Notification Preferences</a></p>`
    : ''

  return {
    subject: args.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h1 style="font-size: 24px; margin: 0 0 16px;">${safeHeading}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${safeIntro}</p>
        ${cta}
        ${footer}
      </div>
    `,
    text: `${args.heading}\n\n${args.intro}${args.ctaUrl ? `\n\n${args.ctaLabel}: ${args.ctaUrl}` : ''}${args.footerUrl ? `\n\nManage preferences: ${args.footerUrl}` : ''}`,
  }
}

async function sendOutboxEmail(entry: { type: EmailType; toEmail: string; payload: Prisma.JsonObject }) {
  switch (entry.type) {
    case EmailType.WELCOME: {
      const payload = entry.payload as unknown as {
        firstName?: string | null
      }
      const message = buildWelcomeEmail({
        firstName: payload.firstName,
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
        trialEndDate?: string | Date
      }
      const message = payload.trialEndDate
        ? buildWelcomeTrialEmail({
            firstName: payload.firstName,
            trialEndDate: payload.trialEndDate,
          })
        : buildWelcomeEmail({
            firstName: payload.firstName,
          })
      await sendEmail({
        to: entry.toEmail,
        subject: message.subject,
        html: message.html,
        text: message.text,
      })
      return
    }
    case EmailType.NOTIFICATION_PORTFOLIO_UPDATE: {
      const envelope = parseNotificationPayload(entry.payload)
      const payload = envelope.variables as {
        userName?: string | null
        signals: Array<{
          id: string
          tier: 'T1' | 'T2'
          category?: 'majors' | 'memecoins' | null
          signal: string
          primaryAsset?: string | null
          secondaryAsset?: string | null
          tertiaryAsset?: string | null
          executiveSummary?: string | null
          associatedData?: string | null
          publishedAt: Date | string
        }>
        portfolioUrl: string
        preferencesUrl: string
      }

      await sendDailySignalEmail({
        to: entry.toEmail,
        userName: payload.userName,
        signals: payload.signals,
        portfolioUrl: payload.portfolioUrl,
        preferencesUrl: payload.preferencesUrl,
      })
      return
    }
    case EmailType.NOTIFICATION_CRYPTO_COMPASS: {
      const envelope = parseNotificationPayload(entry.payload)
      const vars = envelope.variables ?? {}
      const title = typeof vars.title === 'string' ? vars.title : 'New Crypto Compass episode is live'
      const episodeUrl = typeof vars.url === 'string' ? vars.url : null
      const preferencesUrl = typeof vars.preferencesUrl === 'string' ? vars.preferencesUrl : null
      const message = renderSimpleNotificationEmail({
        subject: envelope.subject || 'New Crypto Compass Episode',
        heading: 'Crypto Compass Update',
        intro: title,
        ctaLabel: 'Watch Episode',
        ctaUrl: episodeUrl,
        footerUrl: preferencesUrl,
      })
      await sendEmail({ to: entry.toEmail, subject: message.subject, html: message.html, text: message.text })
      return
    }
    case EmailType.NOTIFICATION_LEARNING_HUB: {
      const envelope = parseNotificationPayload(entry.payload)
      const vars = envelope.variables ?? {}
      const title = typeof vars.title === 'string' ? vars.title : 'New Learning Hub content is available'
      const contentUrl = typeof vars.url === 'string' ? vars.url : null
      const preferencesUrl = typeof vars.preferencesUrl === 'string' ? vars.preferencesUrl : null
      const message = renderSimpleNotificationEmail({
        subject: envelope.subject || 'Learning Hub Update',
        heading: 'Learning Hub Update',
        intro: title,
        ctaLabel: 'Open Learning Hub',
        ctaUrl: contentUrl,
        footerUrl: preferencesUrl,
      })
      await sendEmail({ to: entry.toEmail, subject: message.subject, html: message.html, text: message.text })
      return
    }
    case EmailType.NOTIFICATION_COMMUNITY_MENTION: {
      const envelope = parseNotificationPayload(entry.payload)
      const vars = envelope.variables ?? {}
      const actorName = typeof vars.actorName === 'string' ? vars.actorName : 'Someone'
      const messageUrl = typeof vars.url === 'string' ? vars.url : null
      const snippet = typeof vars.snippet === 'string' ? vars.snippet : 'You were mentioned in the community.'
      const preferencesUrl = typeof vars.preferencesUrl === 'string' ? vars.preferencesUrl : null
      const message = renderSimpleNotificationEmail({
        subject: envelope.subject || 'You were mentioned in the community',
        heading: 'Community Mention',
        intro: `${actorName} mentioned you.\n\n${snippet}`,
        ctaLabel: 'View Mention',
        ctaUrl: messageUrl,
        footerUrl: preferencesUrl,
      })
      await sendEmail({ to: entry.toEmail, subject: message.subject, html: message.html, text: message.text })
      return
    }
    case EmailType.NOTIFICATION_COMMUNITY_REPLY: {
      const envelope = parseNotificationPayload(entry.payload)
      const vars = envelope.variables ?? {}
      const actorName = typeof vars.actorName === 'string' ? vars.actorName : 'Someone'
      const messageUrl = typeof vars.url === 'string' ? vars.url : null
      const snippet = typeof vars.snippet === 'string' ? vars.snippet : 'Someone replied to your message.'
      const preferencesUrl = typeof vars.preferencesUrl === 'string' ? vars.preferencesUrl : null
      const message = renderSimpleNotificationEmail({
        subject: envelope.subject || 'New reply in the community',
        heading: 'Community Reply',
        intro: `${actorName} replied to your message.\n\n${snippet}`,
        ctaLabel: 'View Reply',
        ctaUrl: messageUrl,
        footerUrl: preferencesUrl,
      })
      await sendEmail({ to: entry.toEmail, subject: message.subject, html: message.html, text: message.text })
      return
    }
    default:
      throw new Error(`Unhandled email type: ${entry.type}`)
  }
}

export async function processEmailOutboxBatch({ limit = 50 }: { limit?: number } = {}) {
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
    SET "status" = ${EmailOutboxStatus.SENDING}::"EmailOutboxStatus",
        "updatedAt" = NOW()
    WHERE "id" IN (
      SELECT "id"
      FROM "EmailOutbox"
      WHERE "status" = ${EmailOutboxStatus.QUEUED}::"EmailOutboxStatus"
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
          },
        }),
        prisma.emailLog.create({
          data: {
            userId: entry.userId,
            toEmail: entry.toEmail,
            type: entry.type,
            sentAt: new Date(),
            providerMessageId: null,
          },
        }),
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
          lastError,
        },
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
