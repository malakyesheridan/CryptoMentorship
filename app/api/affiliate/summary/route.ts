import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getOrCreateReferralCode } from '@/lib/referrals'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!referralConfig.enabled) {
      return NextResponse.json({ error: 'Referral system is disabled' }, { status: 503 })
    }

    const userId = session.user.id
    const referralCode = await getOrCreateReferralCode(userId)
    const shortLink = `${referralConfig.appUrl}/${referralCode}`
    const affiliateLink = `${referralConfig.appUrl}/register?ref=${referralCode}`

    const [totalSignups, qualified, payable, paidTotal] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId, referredUserId: { not: null } },
      }),
      prisma.referral.count({
        where: {
          referrerId: userId,
          status: { in: ['QUALIFIED', 'PAYABLE', 'PAID'] },
        },
      }),
      prisma.referral.count({
        where: { referrerId: userId, status: 'PAYABLE' },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId, status: 'PAID' },
        _sum: { commissionAmountCents: true },
      }),
    ])

    logger.info('Affiliate summary fetched', { userId })

    return NextResponse.json({
      referralCode,
      affiliateLink,
      shortLink,
      stats: {
        totalSignups,
        qualified,
        payable,
        paidTotalCents: paidTotal._sum.commissionAmountCents || 0,
      },
    })
  } catch (error) {
    logger.error(
      'Failed to get affiliate summary',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
