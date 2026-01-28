import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { AffiliatePayoutBatchStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    const status = statusParam && (Object.values(AffiliatePayoutBatchStatus) as string[]).includes(statusParam)
      ? (statusParam as AffiliatePayoutBatchStatus)
      : null

    if (statusParam && !status) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }

    const payouts = await prisma.affiliatePayoutBatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: { select: { id: true, name: true, email: true, referralSlug: true } },
        _count: { select: { referrals: true } }
      }
    })

    return NextResponse.json({
      payouts: payouts.map((batch) => ({
        id: batch.id,
        status: batch.status,
        totalAmountCents: batch.totalAmountCents,
        currency: batch.currency,
        dueAt: batch.dueAt?.toISOString() || null,
        paidAt: batch.paidAt?.toISOString() || null,
        createdAt: batch.createdAt.toISOString(),
        referralsCount: batch._count.referrals,
        referrer: batch.referrer
      }))
    })
  } catch (error) {
    logger.error(
      'Failed to get affiliate payout batches',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
