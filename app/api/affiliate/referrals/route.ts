import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!referralConfig.enabled) {
      return NextResponse.json({ error: 'Referral system is disabled' }, { status: 503 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId, referredUserId: { not: null } },
      orderBy: { signedUpAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        referredName: true,
        referredEmail: true,
        signedUpAt: true,
        payableAt: true,
        commissionAmountCents: true,
        currency: true,
        paidAt: true,
        referredUser: {
          select: {
            email: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        referredName: r.referredName || r.referredUser?.name || null,
        referredEmail: r.referredEmail || r.referredUser?.email || null,
        signedUpAt: r.signedUpAt?.toISOString() || null,
        payableAt: r.payableAt?.toISOString() || null,
        commissionAmountCents: r.commissionAmountCents ?? null,
        currency: r.currency,
        paidAt: r.paidAt?.toISOString() || null,
      }))
    })
  } catch (error) {
    logger.error(
      'Failed to get affiliate referrals',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
