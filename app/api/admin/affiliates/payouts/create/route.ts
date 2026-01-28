import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createSchema = z.object({
  referrerId: z.string(),
  referralIds: z.array(z.string()).optional()
})

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const body = await req.json()
    const { referrerId, referralIds } = createSchema.parse(body)

    const referralWhere: any = {
      referrerId,
      status: 'PAYABLE',
      payoutBatchId: null,
      commissionAmountCents: { not: null }
    }

    if (referralIds && referralIds.length > 0) {
      referralWhere.id = { in: referralIds }
    }

    const referrals = await prisma.referral.findMany({
      where: referralWhere,
      select: {
        id: true,
        commissionAmountCents: true,
        currency: true,
        payableAt: true,
        payoutBatchId: true
      }
    })

    if (referrals.length === 0) {
      return NextResponse.json({ error: 'No payable referrals found' }, { status: 400 })
    }

    const currency = referrals[0].currency
    if (referrals.some((r) => r.currency !== currency)) {
      return NextResponse.json({ error: 'Mixed currencies not supported in a single payout batch' }, { status: 400 })
    }

    const totalAmountCents = referrals.reduce((sum, r) => sum + (r.commissionAmountCents || 0), 0)
    const dueAt = referrals.reduce<Date | null>((latest, r) => {
      if (!r.payableAt) return latest
      if (!latest || r.payableAt > latest) return r.payableAt
      return latest
    }, null)

    const batch = await prisma.affiliatePayoutBatch.create({
      data: {
        referrerId,
        status: 'READY',
        totalAmountCents,
        currency,
        dueAt: dueAt ?? new Date(),
        paidByUserId: null
      }
    })

    await prisma.referral.updateMany({
      where: { id: { in: referrals.map((r) => r.id) } },
      data: {
        payoutBatchId: batch.id
      }
    })

    logger.info('Affiliate payout batch created', {
      batchId: batch.id,
      referrerId,
      totalAmountCents,
      createdBy: user.id
    })

    return NextResponse.json({ batch })
  } catch (error) {
    logger.error(
      'Failed to create affiliate payout batch',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
