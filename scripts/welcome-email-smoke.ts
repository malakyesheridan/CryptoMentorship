import { prisma } from '../src/lib/prisma'
import { onTrialStarted } from '../src/lib/membership/trial'
import { processEmailOutboxBatch } from '../src/lib/email-outbox'

async function main() {
  const now = new Date()
  const email = `welcome-trial-smoke-${Date.now()}@example.com`

  console.log(`[welcome-email-smoke] Using email ${email}`)

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Welcome Smoke',
      role: 'guest',
      emailVerified: new Date(),
    }
  })

  const trialStart = new Date()
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      tier: 'T2',
      status: 'trial',
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
    }
  })

  await onTrialStarted({
    userId: user.id,
    membership: {
      status: membership.status,
      currentPeriodEnd: membership.currentPeriodEnd,
      currentPeriodStart: membership.currentPeriodStart,
      tier: membership.tier,
    },
    user: { email: user.email, name: user.name },
    source: 'smoke-test',
  })

  await onTrialStarted({
    userId: user.id,
    membership: {
      status: membership.status,
      currentPeriodEnd: membership.currentPeriodEnd,
      currentPeriodStart: membership.currentPeriodStart,
      tier: membership.tier,
    },
    user: { email: user.email, name: user.name },
    source: 'smoke-test',
  })

  const idempotencyKey = `welcome:${user.id}`
  const outboxRows = await prisma.emailOutbox.findMany({
    where: { idempotencyKey }
  })

  if (outboxRows.length !== 1) {
    throw new Error(`Expected 1 EmailOutbox row, found ${outboxRows.length}`)
  }

  const batchResult = await processEmailOutboxBatch({ limit: 25 })
  console.log('[welcome-email-smoke] processEmailOutboxBatch', batchResult)

  const outbox = await prisma.emailOutbox.findUnique({
    where: { idempotencyKey }
  })

  if (!outbox) {
    throw new Error('EmailOutbox row missing after processing')
  }

  if (outbox.status !== 'SENT') {
    throw new Error(`Expected EmailOutbox status SENT, got ${outbox.status}`)
  }

  console.log('[welcome-email-smoke] OK: outbox sent')
}

main()
  .catch((error) => {
    console.error('[welcome-email-smoke] FAILED', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

