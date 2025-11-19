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
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where clause
    const where: any = { referrerId: userId }
    if (status) {
      where.status = status
    }

    // Get commissions
    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            select: {
              amount: true,
              currency: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.commission.count({ where }),
    ])

    // Get totals
    const [pendingTotal, paidTotal] = await Promise.all([
      prisma.commission.aggregate({
        where: { referrerId: userId, status: 'pending' },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { referrerId: userId, status: 'paid' },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      commissions: commissions.map((c) => ({
        id: c.id,
        amount: c.amount.toNumber(),
        currency: c.currency,
        status: c.status,
        paymentAmount: c.payment.amount.toNumber(),
        paymentDate: c.payment.createdAt.toISOString(),
        paidAt: c.paidAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      pendingTotal: pendingTotal._sum.amount?.toNumber() || 0,
      paidTotal: paidTotal._sum.amount?.toNumber() || 0,
    })
  } catch (error) {
    logger.error(
      'Failed to get commissions',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

