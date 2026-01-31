import { prisma } from '../src/lib/prisma'
import { onTrialStarted } from '../src/lib/membership/trial'
import { sendWelcomeEmail } from '../src/lib/email'

async function main() {
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

  await sendWelcomeEmail({
    to: user.email,
    userName: user.name,
  })

  console.log('[welcome-email-smoke] OK: welcome email sent directly')
}

main()
  .catch((error) => {
    console.error('[welcome-email-smoke] FAILED', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

