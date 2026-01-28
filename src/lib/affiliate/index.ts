import { prisma } from '@/lib/prisma'
import { referralConfig } from '@/lib/env'
import { CommissionType, ReferralStatus } from '@prisma/client'
import { logger } from '@/lib/logger'

export const DEFAULT_HOLD_DAYS = referralConfig.holdDays

export function computeQualifiedAtFromMembership(membership: { status?: string } | null): Date | null {
  if (!membership) return null
  return membership.status === 'active' ? new Date() : null
}

export function computePayableAt(qualifiedAt: Date | null, holdDays: number): Date | null {
  if (!qualifiedAt) return null
  const payableAt = new Date(qualifiedAt)
  payableAt.setDate(payableAt.getDate() + holdDays)
  return payableAt
}

export function computeCommissionAmountCents(
  planPriceCents: number,
  commissionType: CommissionType,
  commissionValue: number
): number {
  if (!planPriceCents || planPriceCents <= 0) return 0

  if (commissionType === 'FIXED') {
    return Math.max(0, Math.round(commissionValue))
  }

  const normalizedPercent = commissionValue > 1 ? commissionValue / 100 : commissionValue
  return Math.max(0, Math.floor(planPriceCents * normalizedPercent))
}

export function deriveReferralStatus(
  referral: {
    status: ReferralStatus
    signedUpAt: Date | null
    trialStartedAt: Date | null
    qualifiedAt: Date | null
    payableAt: Date | null
    paidAt: Date | null
  },
  membershipState: { status?: string } | null,
  now: Date
): ReferralStatus {
  if (referral.status === 'VOID') return 'VOID'
  if (referral.paidAt) return 'PAID'
  if (referral.payableAt && referral.payableAt <= now) return 'PAYABLE'
  if (referral.qualifiedAt) return 'QUALIFIED'
  if (referral.trialStartedAt || membershipState?.status === 'trial') return 'TRIAL'
  if (referral.signedUpAt) return 'SIGNED_UP'
  return 'PENDING'
}

export async function markReferralTrial({
  userId,
  trialStartedAt,
  trialEndsAt
}: {
  userId: string
  trialStartedAt: Date
  trialEndsAt?: Date | null
}) {
  try {
    const referral = await prisma.referral.findUnique({
      where: { referredUserId: userId }
    })
    if (!referral || referral.status === 'VOID') return

    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        trialStartedAt,
        trialEndsAt: trialEndsAt ?? referral.trialEndsAt,
        status: 'TRIAL'
      }
    })
  } catch (error) {
    logger.error(
      'Failed to mark referral trial',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    )
  }
}

export async function markReferralQualifiedFromPayment({
  userId,
  paidAt,
  planPriceCents,
  currency,
  isInitial
}: {
  userId: string
  paidAt: Date
  planPriceCents: number
  currency: string
  isInitial: boolean
}) {
  try {
    const referral = await prisma.referral.findUnique({
      where: { referredUserId: userId }
    })
    if (!referral || referral.status === 'VOID' || referral.status === 'PAID') return
    if (referral.qualifiedAt && referral.firstPaidAt) return

    const holdDays = referral.holdDays ?? DEFAULT_HOLD_DAYS
    const qualifiedAt = referral.qualifiedAt ?? paidAt
    const commissionType = referral.commissionType ?? 'PERCENT'
    const commissionValue = referral.commissionValue?.toNumber()
      ?? (isInitial ? referralConfig.initialCommissionRate : referralConfig.recurringCommissionRate)
    const commissionAmountCents = referral.commissionAmountCents
      ?? computeCommissionAmountCents(planPriceCents, commissionType, commissionValue)

    const payableAt = referral.payableAt ?? computePayableAt(qualifiedAt, holdDays)

    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        firstPaidAt: referral.firstPaidAt ?? paidAt,
        qualifiedAt,
        commissionType,
        commissionValue,
        commissionAmountCents,
        currency: currency || referral.currency,
        holdDays,
        payableAt,
        status: 'QUALIFIED'
      }
    })
  } catch (error) {
    logger.error(
      'Failed to mark referral qualified',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    )
  }
}

export async function voidReferralIfInHold({
  userId,
  occurredAt,
  reason
}: {
  userId: string
  occurredAt: Date
  reason: string
}) {
  try {
    const referral = await prisma.referral.findUnique({
      where: { referredUserId: userId }
    })
    if (!referral || referral.status === 'PAID' || referral.status === 'VOID') return

    const payableAt = referral.payableAt
    const isBeforeQualification = !referral.qualifiedAt
    const isWithinHold = payableAt ? occurredAt < payableAt : true

    if (isBeforeQualification || isWithinHold) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'VOID',
          metadata: JSON.stringify({
            ...safeParseJson(referral.metadata),
            voidedAt: occurredAt.toISOString(),
            voidReason: reason
          })
        }
      })
    }
  } catch (error) {
    logger.error(
      'Failed to void referral',
      error instanceof Error ? error : new Error(String(error)),
      { userId, reason }
    )
  }
}

function safeParseJson(value: string | null): Record<string, any> {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}
