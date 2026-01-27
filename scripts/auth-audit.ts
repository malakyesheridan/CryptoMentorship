import { Prisma } from '@prisma/client'
import { prisma } from '../src/lib/prisma'

type CountRow = { count: number | bigint }

function toNumber(value: number | bigint | null | undefined): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  return 0
}

async function main() {
  const generatedAt = new Date().toISOString()

  const duplicateEmailsRaw = await prisma.$queryRaw<{ email: string; count: number | bigint }[]>(
    Prisma.sql`
      SELECT LOWER(email) AS email, COUNT(*)::int AS count
      FROM "User"
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, email ASC
    `
  )

  const usersWithoutMembershipRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "User" u
      LEFT JOIN "Membership" m ON m."userId" = u.id
      WHERE m.id IS NULL
    `
  )

  const membershipsWithoutUserRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Membership" m
      LEFT JOIN "User" u ON u.id = m."userId"
      WHERE u.id IS NULL
    `
  )

  const trialMissingEndRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Membership"
      WHERE status = 'trial' AND "currentPeriodEnd" IS NULL
    `
  )

  const trialInvalidRange = await prisma.$queryRaw<{
    id: string
    userId: string
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
  }[]>(
    Prisma.sql`
      SELECT id, "userId", "currentPeriodStart", "currentPeriodEnd"
      FROM "Membership"
      WHERE status = 'trial'
        AND "currentPeriodStart" IS NOT NULL
        AND "currentPeriodEnd" IS NOT NULL
        AND "currentPeriodStart" > "currentPeriodEnd"
      ORDER BY "currentPeriodStart" DESC
      LIMIT 50
    `
  )

  const expiredButActiveCountRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Membership"
      WHERE status IN ('trial', 'active')
        AND "currentPeriodEnd" IS NOT NULL
        AND "currentPeriodEnd" < NOW()
    `
  )

  const expiredButActive = await prisma.$queryRaw<{
    id: string
    userId: string
    status: string
    currentPeriodEnd: Date | null
  }[]>(
    Prisma.sql`
      SELECT id, "userId", status, "currentPeriodEnd"
      FROM "Membership"
      WHERE status IN ('trial', 'active')
        AND "currentPeriodEnd" IS NOT NULL
        AND "currentPeriodEnd" < NOW()
      ORDER BY "currentPeriodEnd" ASC
      LIMIT 50
    `
  )

  const invalidTierRaw = await prisma.$queryRaw<{ tier: string; count: number | bigint }[]>(
    Prisma.sql`
      SELECT tier, COUNT(*)::int AS count
      FROM "Membership"
      WHERE tier NOT IN ('T1', 'T2', 'T3')
      GROUP BY tier
      ORDER BY COUNT(*) DESC
    `
  )

  const invalidStatusRaw = await prisma.$queryRaw<{ status: string; count: number | bigint }[]>(
    Prisma.sql`
      SELECT status, COUNT(*)::int AS count
      FROM "Membership"
      WHERE status NOT IN ('active', 'trial', 'paused', 'inactive')
      GROUP BY status
      ORDER BY COUNT(*) DESC
    `
  )

  const usersMissingCriticalFieldsRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "User"
      WHERE email IS NULL
        OR email = ''
        OR role IS NULL
        OR "createdAt" IS NULL
    `
  )

  const usersWithMembershipButGuestRoleRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "User" u
      JOIN "Membership" m ON m."userId" = u.id
      WHERE u.role = 'guest'
    `
  )

  const usersWithRoleButNoActiveMembershipRaw = await prisma.$queryRaw<CountRow[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "User" u
      LEFT JOIN "Membership" m ON m."userId" = u.id
      WHERE u.role IN ('member', 'editor', 'admin')
        AND (
          m.id IS NULL
          OR m.status NOT IN ('active', 'trial')
          OR (m.status = 'trial' AND m."currentPeriodEnd" IS NULL)
          OR (m."currentPeriodEnd" IS NOT NULL AND m."currentPeriodEnd" < NOW())
        )
    `
  )

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      memberships: {
        take: 1,
        select: {
          tier: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          stripeSubscriptionId: true
        }
      }
    }
  })

  const result = {
    generatedAt,
    counts: {
      duplicateEmails: duplicateEmailsRaw.length,
      usersWithoutMembership: toNumber(usersWithoutMembershipRaw[0]?.count),
      membershipsWithoutUser: toNumber(membershipsWithoutUserRaw[0]?.count),
      trialMissingEnd: toNumber(trialMissingEndRaw[0]?.count),
      expiredTrialOrActive: toNumber(expiredButActiveCountRaw[0]?.count),
      usersMissingCriticalFields: toNumber(usersMissingCriticalFieldsRaw[0]?.count),
      usersWithMembershipButGuestRole: toNumber(usersWithMembershipButGuestRoleRaw[0]?.count),
      usersWithRoleButNoActiveMembership: toNumber(usersWithRoleButNoActiveMembershipRaw[0]?.count),
      premiumAccessWithoutActiveMembership: toNumber(usersWithRoleButNoActiveMembershipRaw[0]?.count)
    },
    anomalies: {
      duplicateEmails: duplicateEmailsRaw.map((row) => ({
        email: row.email,
        count: toNumber(row.count)
      })),
      trialInvalidRange,
      expiredButActive,
      invalidTier: invalidTierRaw.map((row) => ({
        tier: row.tier,
        count: toNumber(row.count)
      })),
      invalidStatus: invalidStatusRaw.map((row) => ({
        status: row.status,
        count: toNumber(row.count)
      }))
    },
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      membership: user.memberships[0] ?? null
    }))
  }

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error('auth-audit failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
