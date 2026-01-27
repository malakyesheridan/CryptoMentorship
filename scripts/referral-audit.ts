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

  const referralsWithMissingReferrer = await prisma.$queryRaw<{ id: string; referrerId: string }[]>(Prisma.sql`
    SELECT r.id, r."referrerId"
    FROM "Referral" r
    LEFT JOIN "User" u ON u.id = r."referrerId"
    WHERE u.id IS NULL
  `)

  const referralsWithMissingReferred = await prisma.$queryRaw<{ id: string; referredUserId: string }[]>(Prisma.sql`
    SELECT r.id, r."referredUserId"
    FROM "Referral" r
    LEFT JOIN "User" u ON u.id = r."referredUserId"
    WHERE r."referredUserId" IS NOT NULL AND u.id IS NULL
  `)

  const duplicateReferred = await prisma.$queryRaw<{ referredUserId: string; count: number }[]>(Prisma.sql`
    SELECT r."referredUserId", COUNT(*)::int AS count
    FROM "Referral" r
    WHERE r."referredUserId" IS NOT NULL
    GROUP BY r."referredUserId"
    HAVING COUNT(*) > 1
  `)

  const last20Referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      referrer: { select: { id: true, email: true, name: true, referralSlug: true } },
      referredUser: { select: { id: true, email: true, name: true, createdAt: true } }
    }
  })

  const last20Signups = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, email: true, name: true, createdAt: true }
  })

  const signupReferralLinks = await prisma.referral.findMany({
    where: { referredUserId: { in: last20Signups.map((u) => u.id) } },
    select: { referredUserId: true, referrerId: true, referralCode: true, createdAt: true }
  })

  const referralsByReferred = new Map(signupReferralLinks.map((r) => [r.referredUserId, r]))

  const result = {
    generatedAt,
    counts: {
      totalReferrals,
      referralsLast7,
      referralsLast30,
      selfReferrals: Array.isArray(selfReferrals) ? selfReferrals.length : 0,
      missingReferrers: referralsWithMissingReferrer.length,
      missingReferredUsers: referralsWithMissingReferred.length,
      duplicateReferredUsers: duplicateReferred.length
    },
    anomalies: {
      selfReferrals,
      referralsWithMissingReferrer,
      referralsWithMissingReferred,
      duplicateReferred
    },
    last20Referrals: last20Referrals.map((r) => ({
      id: r.id,
      referralCode: r.referralCode,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      referrer: {
        id: r.referrer?.id,
        email: r.referrer?.email,
        name: r.referrer?.name,
        referralSlug: r.referrer?.referralSlug
      },
      referredUser: r.referredUser
        ? {
            id: r.referredUser.id,
            email: r.referredUser.email,
            name: r.referredUser.name,
            createdAt: r.referredUser.createdAt
          }
        : null
    })),
    last20Signups: last20Signups.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      referral: referralsByReferred.get(u.id) || null
    }))
  }

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error('referral-audit failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
