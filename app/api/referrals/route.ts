import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getOrCreateReferralCode } from '@/lib/referrals'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!referralConfig.enabled) {
      return NextResponse.json(
        { error: 'Referral system is disabled' },
        { status: 503 }
      )
    }

    const userId = session.user.id

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(userId)
    const affiliateLink = `${referralConfig.appUrl}/register?ref=${referralCode}`
    const shortLink = `${referralConfig.appUrl}/ref/${referralCode}`
    
    logger.info('Referral link generated', {
      userId,
      referralCode,
      appUrl: referralConfig.appUrl,
      affiliateLink,
      shortLink,
    })

    // Get referral stats
    const [totalReferrals, completedReferrals, pendingReferrals] = await Promise.all([
      prisma.referral.count({
        where: { referrerId: userId },
      }),
      prisma.referral.count({
        where: {
          referrerId: userId,
          status: 'completed',
        },
      }),
      prisma.referral.count({
        where: {
          referrerId: userId,
          status: 'pending',
        },
      }),
    ])

    // Get commission stats
    const [totalCommissions, pendingCommissions, paidCommissions] = await Promise.all([
      prisma.commission.aggregate({
        where: { referrerId: userId },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: {
          referrerId: userId,
          status: 'pending',
        },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: {
          referrerId: userId,
          status: 'paid',
        },
        _sum: { amount: true },
      }),
    ])

    // Get recent referrals with enhanced user details
    const recentReferrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        completedAt: true,
        createdAt: true,
        referredUser: {
          select: {
            email: true,
            name: true,
            createdAt: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      referralCode,
      affiliateLink,
      shortLink,
      stats: {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalCommissions: totalCommissions._sum.amount?.toNumber() || 0,
        pendingCommissions: pendingCommissions._sum.amount?.toNumber() || 0,
        paidCommissions: paidCommissions._sum.amount?.toNumber() || 0,
      },
      recentReferrals: recentReferrals.map((r) => ({
        id: r.id,
        referredUserEmail: r.referredUser?.email || null,
        referredUserName: r.referredUser?.name || null,
        referredUserImage: r.referredUser?.image || null,
        referredUserCreatedAt: r.referredUser?.createdAt?.toISOString() || null,
        status: r.status,
        completedAt: r.completedAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    logger.error(
      'Failed to get referral data',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

