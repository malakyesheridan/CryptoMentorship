import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const grouped = await prisma.referral.groupBy({
      by: ['referrerId', 'status'],
      where: { referredUserId: { not: null } },
      _count: { _all: true },
      _sum: { commissionAmountCents: true }
    })

    const referrerIds = Array.from(new Set(grouped.map((g) => g.referrerId)))
    const referrers = await prisma.user.findMany({
      where: { id: { in: referrerIds } },
      select: { id: true, name: true, email: true, referralSlug: true }
    })

    const referrerMap = new Map(referrers.map((u) => [u.id, u]))
    const affiliateStats = referrerIds.map((referrerId) => {
      const rows = grouped.filter((g) => g.referrerId === referrerId)
      const totalSignups = rows.reduce((acc, row) => acc + row._count._all, 0)
      const qualified = rows
        .filter((row) => ['QUALIFIED', 'PAYABLE', 'PAID'].includes(row.status))
        .reduce((acc, row) => acc + row._count._all, 0)
      const payable = rows
        .filter((row) => row.status === 'PAYABLE')
        .reduce((acc, row) => acc + row._count._all, 0)
      const paidTotalCents = rows
        .filter((row) => row.status === 'PAID')
        .reduce((acc, row) => acc + (row._sum.commissionAmountCents || 0), 0)

      return {
        referrer: referrerMap.get(referrerId) || { id: referrerId, name: null, email: null, referralSlug: null },
        stats: {
          totalSignups,
          qualified,
          payable,
          paidTotalCents
        }
      }
    })

    affiliateStats.sort((a, b) => b.stats.totalSignups - a.stats.totalSignups)

    return NextResponse.json({ affiliates: affiliateStats })
  } catch (error) {
    logger.error(
      'Failed to get affiliates list',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
