import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  try {
    await requireRoleAPI(['admin'])

    const referrals = await prisma.referral.findMany({
      where: { referredUserId: { not: null } },
      orderBy: { createdAt: 'desc' },
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
        referrer: { select: { id: true, name: true, email: true } },
        referredUser: { select: { id: true, name: true, email: true } }
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
        referrer: r.referrer
      }))
    })
  } catch (error) {
    logger.error(
      'Failed to get affiliate referrals (admin)',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}
