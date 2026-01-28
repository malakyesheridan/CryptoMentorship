import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: { batchId: string }
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const batchId = params.batchId

    const batch = await prisma.affiliatePayoutBatch.findUnique({
      where: { id: batchId },
      include: { referrals: true }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Payout batch not found' }, { status: 404 })
    }

    if (batch.status === 'PAID') {
      return NextResponse.json({ success: true, batch })
    }

    const paidAt = new Date()

    const [updatedBatch] = await prisma.$transaction([
      prisma.affiliatePayoutBatch.update({
        where: { id: batchId },
        data: {
          status: 'PAID',
          paidAt,
          paidByUserId: user.id
        }
      }),
      prisma.referral.updateMany({
        where: { payoutBatchId: batchId },
        data: {
          status: 'PAID',
          paidAt,
          paidByUserId: user.id
        }
      })
    ])

    logger.info('Affiliate payout batch marked paid', {
      batchId,
      referrerId: batch.referrerId,
      paidBy: user.id
    })

    return NextResponse.json({ success: true, batch: updatedBatch })
  } catch (error) {
    logger.error(
      'Failed to mark payout batch paid',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
