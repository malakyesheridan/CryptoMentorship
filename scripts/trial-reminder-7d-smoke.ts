import { prisma } from '../src/lib/prisma'
import { runTrialReminder7DayDigest } from '../src/lib/jobs/trial-reminder-7d'

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toDateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10)
}

async function run() {
  const now = new Date()
  const targetDay = addDays(startOfUtcDay(now), 7)
  const trialEnd = new Date(targetDay)
  trialEnd.setUTCHours(12, 0, 0, 0)

  const email = `trial-reminder-7d-smoke-${Date.now()}@example.com`
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Trial Reminder Smoke',
      role: 'guest',
      emailVerified: new Date()
    }
  })

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      tier: 'T1',
      status: 'trial',
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnd
    }
  })

  const firstRun = await runTrialReminder7DayDigest({ trigger: 'smoke', now })
  const firstLogs = await prisma.trialReminderLog.findMany({
    where: { membershipId: membership.id }
  })

  const secondRun = await runTrialReminder7DayDigest({ trigger: 'smoke', now })
  const secondLogs = await prisma.trialReminderLog.findMany({
    where: { membershipId: membership.id }
  })

  console.log(JSON.stringify({
    targetDateKey: toDateKey(targetDay),
    trialEnd: trialEnd.toISOString(),
    firstRun,
    firstLogCount: firstLogs.length,
    secondRun,
    secondLogCount: secondLogs.length
  }, null, 2))
}

run()
  .catch((error) => {
    console.error('trial-reminder-7d-smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await prisma.roiDashboardSnapshot.deleteMany({
        where: { scope: 'TRIAL_REMINDER_7D_DIGEST' }
      })
      await prisma.trialReminderLog.deleteMany({
        where: { reminderType: 'TRIAL_7_DAYS_LEFT' }
      })
      await prisma.membership.deleteMany({
        where: { user: { email: { startsWith: 'trial-reminder-7d-smoke-' } } }
      })
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'trial-reminder-7d-smoke-' } }
      })
    } catch (cleanupError) {
      console.error('trial-reminder-7d-smoke cleanup failed:', cleanupError)
    }
    await prisma.$disconnect()
  })
