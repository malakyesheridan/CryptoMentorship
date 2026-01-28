import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireRoleAPI(['admin'])

    const referrerId = params.id
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: { id: true, name: true, email: true, referralSlug: true }
    })

    if (!referrer) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referralCode: true,
        slugUsed: true,
        status: true,
        referredEmail: true,
        referredName: true,
        clickedAt: true,
        signedUpAt: true,
        trialStartedAt: true,
        trialEndsAt: true,
        firstPaidAt: true,
        qualifiedAt: true,
        payableAt: true,
        paidAt: true,
        commissionAmountCents: true,
        currency: true,
        payoutBatchId: true,
        referredUser: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    return NextResponse.json({
      referrer,
      referrals: referrals.map((r) => ({
        id: r.id,
        referralCode: r.referralCode,
        slugUsed: r.slugUsed,
        status: r.status,
        referredEmail: r.referredEmail || r.referredUser?.email || null,
        referredName: r.referredName || r.referredUser?.name || null,
        clickedAt: r.clickedAt?.toISOString() || null,
        signedUpAt: r.signedUpAt?.toISOString() || null,
        trialStartedAt: r.trialStartedAt?.toISOString() || null,
        trialEndsAt: r.trialEndsAt?.toISOString() || null,
        firstPaidAt: r.firstPaidAt?.toISOString() || null,
        qualifiedAt: r.qualifiedAt?.toISOString() || null,
        payableAt: r.payableAt?.toISOString() || null,
        paidAt: r.paidAt?.toISOString() || null,
        commissionAmountCents: r.commissionAmountCents ?? null,
        currency: r.currency,
        payoutBatchId: r.payoutBatchId || null
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
