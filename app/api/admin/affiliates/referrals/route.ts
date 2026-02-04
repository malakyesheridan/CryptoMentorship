import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRoleAPI } from '@/lib/auth-server'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { getOrCreateReferralCode, linkReferralToUser } from '@/lib/referrals'
import { markReferralQualifiedFromPayment } from '@/lib/affiliate'
import { z } from 'zod'

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

const createSchema = z.object({
  referredUserId: z.string(),
  referrerId: z.string()
})

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireRoleAPI(['admin'])
    const body = await req.json()
    const { referredUserId, referrerId } = createSchema.parse(body)

    if (referredUserId === referrerId) {
      return NextResponse.json({ error: 'Cannot create a self-referral' }, { status: 400 })
    }

    const [referredUser, referrer, existingReferral, membership, firstPayment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: referredUserId },
        select: { id: true, name: true, email: true, createdAt: true }
      }),
      prisma.user.findUnique({
        where: { id: referrerId },
        select: { id: true, name: true, email: true, referralSlug: true }
      }),
      prisma.referral.findUnique({
        where: { referredUserId }
      }),
      prisma.membership.findUnique({
        where: { userId: referredUserId },
        select: {
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true
        }
      }),
      prisma.payment.findFirst({
        where: { userId: referredUserId, status: 'succeeded' },
        orderBy: { createdAt: 'asc' },
        select: {
          amount: true,
          currency: true,
          createdAt: true,
          metadata: true
        }
      })
    ])

    if (!referredUser) {
      return NextResponse.json({ error: 'Referred user not found' }, { status: 404 })
    }

    if (!referrer) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
    }

    if (existingReferral) {
      return NextResponse.json(
        { error: 'This user is already linked to a referral' },
        { status: 409 }
      )
    }

    const referralCode = await getOrCreateReferralCode(referrerId)
    const signedUpAt = referredUser.createdAt
    const trialStartedAt = membership?.status === 'trial'
      ? (membership.currentPeriodStart || membership.createdAt || signedUpAt)
      : null
    const trialEndsAt = membership?.status === 'trial'
      ? (membership.currentPeriodEnd || null)
      : null

    const linkResult = await linkReferralToUser(referralCode, referredUserId, undefined, {
      referredEmail: referredUser.email,
      referredName: referredUser.name,
      signedUpAt,
      trialStartedAt,
      trialEndsAt,
      source: 'admin-manual'
    })

    if (!linkResult.success || !linkResult.referralId) {
      return NextResponse.json(
        { error: linkResult.error || 'Failed to link referral' },
        { status: 400 }
      )
    }

    if (firstPayment) {
      const metadata = safeParseJson(firstPayment.metadata)
      const isInitial = typeof metadata?.isInitial === 'boolean' ? metadata.isInitial : true
      const amountNumber = typeof firstPayment.amount === 'number'
        ? firstPayment.amount
        : firstPayment.amount.toNumber()
      const planPriceCents = Math.round(amountNumber * 100)

      await markReferralQualifiedFromPayment({
        userId: referredUserId,
        paidAt: firstPayment.createdAt,
        planPriceCents,
        currency: firstPayment.currency || 'usd',
        isInitial
      })

      const updated = await prisma.referral.findUnique({
        where: { referredUserId },
        select: { id: true, payableAt: true, status: true }
      })

      if (updated?.payableAt && updated.payableAt <= new Date() && updated.status === 'QUALIFIED') {
        await prisma.referral.update({
          where: { id: updated.id },
          data: { status: 'PAYABLE' }
        })
      }
    }

    await prisma.referral.update({
      where: { id: linkResult.referralId },
      data: {
        metadata: JSON.stringify({
          source: 'admin-manual',
          createdBy: adminUser.id,
          createdAt: new Date().toISOString()
        })
      }
    })

    logger.info('Manual affiliate referral linked', {
      referralId: linkResult.referralId,
      referredUserId,
      referrerId,
      createdBy: adminUser.id
    })

    return NextResponse.json({ success: true, referralId: linkResult.referralId })
  } catch (error) {
    logger.error(
      'Failed to create manual affiliate referral',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

function safeParseJson(value: string | null): Record<string, any> | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
