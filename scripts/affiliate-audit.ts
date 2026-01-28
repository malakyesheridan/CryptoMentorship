import { Prisma } from '@prisma/client'
import { prisma } from '../src/lib/prisma'

const DAYS = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

async function main() {
  const generatedAt = new Date().toISOString()

  const totalReferrals = await prisma.referral.count()
  const referralsLast7 = await prisma.referral.count({ where: { createdAt: { gte: DAYS(7) } } })
  const referralsLast30 = await prisma.referral.count({ where: { createdAt: { gte: DAYS(30) } } })

  const selfReferrals = await prisma.referral.findMany({
    where: {
      referredUserId: { not: null },
      referrerId: { equals: Prisma.raw('"Referral"."referredUserId"') } as any
    }
  }).catch(async () => {
    return prisma.$queryRaw<{ id: string; referrerId: string; referredUserId: string }[]>(Prisma.sql`
      SELECT r.id, r."referrerId", r."referredUserId"
      FROM "Referral" r
      WHERE r."referredUserId" IS NOT NULL AND r."referrerId" = r."referredUserId"
    `)
  })

  const duplicateReferred = await prisma.$queryRaw<{ referredUserId: string; count: number }[]>(Prisma.sql`
    SELECT r."referredUserId", COUNT(*)::int AS count
    FROM "Referral" r
    WHERE r."referredUserId" IS NOT NULL
    GROUP BY r."referredUserId"
    HAVING COUNT(*) > 1
  `)

  const missingReferredDetails = await prisma.referral.findMany({
    where: {
      referredUserId: { not: null },
      OR: [{ referredEmail: null }, { referredName: null }]
    },
    select: { id: true, referredUserId: true, referredEmail: true, referredName: true }
  })

  const missingPayableAt = await prisma.referral.findMany({
    where: {
      status: { in: ['QUALIFIED', 'PAYABLE', 'PAID'] },
      payableAt: null
    },
    select: { id: true, status: true, qualifiedAt: true }
  })

  const last50Referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      referrer: { select: { id: true, email: true, name: true, referralSlug: true } },
      referredUser: { select: { id: true, email: true, name: true, createdAt: true } }
    }
  })

  const result = {
    generatedAt,
    counts: {
      totalReferrals,
      referralsLast7,
      referralsLast30,
      selfReferrals: Array.isArray(selfReferrals) ? selfReferrals.length : 0,
      duplicateReferredUsers: duplicateReferred.length,
      missingReferredDetails: missingReferredDetails.length,
      missingPayableAt: missingPayableAt.length
    },
    anomalies: {
      selfReferrals,
      duplicateReferred,
      missingReferredDetails,
      missingPayableAt
    },
    last50Referrals: last50Referrals.map((r) => ({
      id: r.id,
      referralCode: r.referralCode,
      slugUsed: r.slugUsed,
      status: r.status,
      clickedAt: r.clickedAt,
      signedUpAt: r.signedUpAt,
      trialStartedAt: r.trialStartedAt,
      trialEndsAt: r.trialEndsAt,
      qualifiedAt: r.qualifiedAt,
      payableAt: r.payableAt,
      paidAt: r.paidAt,
      commissionAmountCents: r.commissionAmountCents,
      referrer: r.referrer,
      referredUser: r.referredUser
    }))
  }

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error('affiliate-audit failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
