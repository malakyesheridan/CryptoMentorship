import { prisma } from '../src/lib/prisma'
import {
  getOrCreateReferralCode,
  linkReferralToUser,
  validateReferralCode,
} from '../src/lib/referrals'

type SmokeResult = {
  referrerId: string
  referrerEmail: string
  referralCode: string
  referredUserId: string
  referredUserEmail: string
  referralRecordId?: string
  dashboardRecentReferral?: {
    referredUserEmail: string | null
    referredUserName: string | null
    referredUserCreatedAt: string | null
    status: string
  } | null
}

function uniqueEmail(prefix: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}.${stamp}@example.com`
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log(`[referral-smoke] startedAt=${startedAt}`)

  const referrerEmail = uniqueEmail('referrer')
  const referredEmail = uniqueEmail('referred')

  const referrer = await prisma.user.create({
    data: {
      email: referrerEmail,
      name: 'Referral Smoke Referrer',
      role: 'member',
      isActive: true,
    },
  })

  let referralCode = ''
  let referredUserId = ''
  let referralRecordId: string | undefined

  try {
    referralCode = await getOrCreateReferralCode(referrer.id)
    const validation = await validateReferralCode(referralCode)
    if (!validation.valid) {
      throw new Error(`validateReferralCode failed: ${validation.error}`)
    }

    const referredUser = await prisma.user.create({
      data: {
        email: referredEmail,
        name: 'Referral Smoke Referred',
        role: 'member',
        isActive: true,
      },
    })
    referredUserId = referredUser.id

    const linkResult = await linkReferralToUser(referralCode, referredUser.id)
    if (!linkResult.success || !linkResult.referralId) {
      throw new Error(`linkReferralToUser failed: ${linkResult.error || 'unknown'}`)
    }
    referralRecordId = linkResult.referralId

    const referralRecord = await prisma.referral.findUnique({
      where: { id: referralRecordId },
      include: {
        referrer: { select: { email: true } },
        referredUser: { select: { email: true, createdAt: true, name: true } },
      },
    })

    if (!referralRecord?.referredUser || referralRecord.referredUser.email !== referredEmail) {
      throw new Error('Referral record does not include referred user details')
    }

    const dashboardRecent = await prisma.referral.findMany({
      where: { referrerId: referrer.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        referredUser: {
          select: { email: true, name: true, createdAt: true },
        },
      },
    })

    const matchedDashboard = dashboardRecent.find(
      (item) => item.referredUser?.email === referredEmail
    )

    const result: SmokeResult = {
      referrerId: referrer.id,
      referrerEmail,
      referralCode,
      referredUserId,
      referredUserEmail: referredEmail,
      referralRecordId,
      dashboardRecentReferral: matchedDashboard
        ? {
            referredUserEmail: matchedDashboard.referredUser?.email || null,
            referredUserName: matchedDashboard.referredUser?.name || null,
            referredUserCreatedAt: matchedDashboard.referredUser?.createdAt
              ? matchedDashboard.referredUser.createdAt.toISOString()
              : null,
            status: matchedDashboard.status,
          }
        : null,
    }

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await prisma.referral.deleteMany({
      where: {
        OR: [
          { referrerId: referrer.id },
          referredUserId ? { referredUserId } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (referredUserId) {
      await prisma.user.deleteMany({ where: { id: referredUserId } })
    }

    await prisma.user.deleteMany({ where: { id: referrer.id } })
  }
}

main()
  .catch((error) => {
    console.error('referral-smoke failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
