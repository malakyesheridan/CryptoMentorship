import { prisma } from '@/lib/prisma'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

/**
 * Generate a unique referral code for a user
 * Format: REF-{USER_ID_PREFIX}-{TIMESTAMP}
 */
export async function generateReferralCode(userId: string): Promise<string> {
  if (!referralConfig.enabled) {
    throw new Error('Referral system is disabled')
  }

  const userPrefix = userId.slice(0, 8).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  const code = `REF-${userPrefix}-${timestamp}`

  // Ensure uniqueness (very unlikely collision, but safety first)
  const existing = await prisma.referral.findUnique({
    where: { referralCode: code },
  })

  if (existing) {
    // Retry with additional randomness
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `REF-${userPrefix}-${timestamp}-${randomSuffix}`
  }

  return code
}

/**
 * Get or create a referral code for a user
 * Returns existing code if one exists, otherwise creates a new one
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  if (!referralConfig.enabled) {
    throw new Error('Referral system is disabled')
  }

  // Check if user already has a referral code
  const existingReferral = await prisma.referral.findFirst({
    where: {
      referrerId: userId,
      status: { in: ['pending', 'completed'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existingReferral) {
    return existingReferral.referralCode
  }

  // Create new referral code
  const referralCode = await generateReferralCode(userId)
  const expiresAt = referralConfig.codeExpiryDays
    ? new Date(Date.now() + referralConfig.codeExpiryDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.referral.create({
    data: {
      referrerId: userId,
      referralCode,
      expiresAt,
      status: 'pending',
    },
  })

  return referralCode
}

/**
 * Validate a referral code
 * Returns true if code is valid and can be used
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  error?: string
  referral?: { id: string; referrerId: string; status: string }
}> {
  if (!referralConfig.enabled) {
    return { valid: false, error: 'Referral system is disabled' }
  }

  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Referral code is required' }
  }

  const referral = await prisma.referral.findUnique({
    where: { referralCode: code },
  })

  if (!referral) {
    return { valid: false, error: 'Invalid referral code' }
  }

  // Check if expired
  if (referral.expiresAt && referral.expiresAt < new Date()) {
    return { valid: false, error: 'Referral code has expired' }
  }

  // Check if already used
  if (referral.status === 'completed' && referral.referredUserId) {
    return { valid: false, error: 'Referral code has already been used' }
  }

  // Check if cancelled
  if (referral.status === 'cancelled') {
    return { valid: false, error: 'Referral code has been cancelled' }
  }

  return {
    valid: true,
    referral: {
      id: referral.id,
      referrerId: referral.referrerId,
      status: referral.status,
    },
  }
}

/**
 * Link a referral to a user during registration
 * This is called after user creation, in a transaction
 */
export async function linkReferralToUser(
  referralCode: string,
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  if (!referralConfig.enabled) {
    return { success: false, error: 'Referral system is disabled' }
  }

  const prismaClient = tx || prisma

  try {
    // Validate referral code
    const validation = await validateReferralCode(referralCode)
    if (!validation.valid || !validation.referral) {
      return { success: false, error: validation.error || 'Invalid referral code' }
    }

    const referral = validation.referral

    // Prevent self-referral
    if (referral.referrerId === userId) {
      return { success: false, error: 'You cannot use your own referral code' }
    }

    // Check if user is already referred
    const existingReferral = await prismaClient.referral.findUnique({
      where: { referredUserId: userId },
    })

    if (existingReferral) {
      return { success: false, error: 'This account is already linked to a referral' }
    }

    // Link referral to user
    const updatedReferral = await prismaClient.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId: userId,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    logger.info('Referral linked to user', {
      referralId: updatedReferral.id,
      referrerId: referral.referrerId,
      referredUserId: userId,
    })

    return { success: true, referralId: updatedReferral.id }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle unique constraint violation (user already referred)
      if (error.code === 'P2002') {
        return { success: false, error: 'This account is already linked to a referral' }
      }
    }

    logger.error(
      'Failed to link referral to user',
      error instanceof Error ? error : new Error(String(error)),
      { referralCode, userId }
    )

    return { success: false, error: 'Failed to link referral' }
  }
}

/**
 * Calculate commission amount (15% of payment)
 */
export function calculateCommission(paymentAmount: number, rate?: number): number {
  const commissionRate = rate || referralConfig.commissionRate
  const amount = new Decimal(paymentAmount)
    .times(commissionRate)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN)
    .toNumber()

  // Ensure minimum of $0.01
  return Math.max(amount, 0.01)
}

/**
 * Create commission if user was referred
 * This is called after payment is successfully created
 * NON-BLOCKING: Errors are logged but don't fail payment processing
 */
export async function createCommissionIfReferred(
  userId: string,
  paymentId: string,
  paymentAmount: number
): Promise<{ success: boolean; commissionId?: string; error?: string }> {
  if (!referralConfig.enabled) {
    return { success: false, error: 'Referral system is disabled' }
  }

  try {
    // Find referral for this user
    const referral = await prisma.referral.findUnique({
      where: { referredUserId: userId },
      include: { referrer: true },
    })

    if (!referral || referral.status !== 'completed') {
      // User wasn't referred, or referral not completed - this is fine, no commission
      return { success: false, error: 'User was not referred' }
    }

    // Check if commission already exists for this payment
    const existingCommission = await prisma.commission.findFirst({
      where: {
        paymentId,
        referralId: referral.id,
      },
    })

    if (existingCommission) {
      // Commission already created - this is fine, idempotent
      return { success: true, commissionId: existingCommission.id }
    }

    // Calculate commission
    const commissionAmount = calculateCommission(paymentAmount)

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        referralId: referral.id,
        paymentId,
        referrerId: referral.referrerId,
        amount: commissionAmount,
        currency: 'usd', // TODO: Get from payment if multi-currency
        status: 'pending',
      },
    })

    logger.info('Commission created', {
      commissionId: commission.id,
      referralId: referral.id,
      referrerId: referral.referrerId,
      paymentId,
      amount: commissionAmount,
    })

    return { success: true, commissionId: commission.id }
  } catch (error) {
    // Log error but don't throw - payment processing should continue
    logger.error(
      'Failed to create commission (non-blocking)',
      error instanceof Error ? error : new Error(String(error)),
      { userId, paymentId, paymentAmount }
    )

    return { success: false, error: 'Failed to create commission' }
  }
}

/**
 * Cookie management for referral tracking
 */
export function getReferralCookieName(): string {
  return 'referral_code'
}

export function setReferralCookie(referralCode: string): string {
  // Returns cookie string to be set in response headers
  const expiryDays = referralConfig.cookieExpiryDays
  const expires = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toUTCString()
  return `${getReferralCookieName()}=${referralCode}; Path=/; Expires=${expires}; SameSite=Lax; HttpOnly`
}

export function parseReferralCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const referralCookie = cookies.find((c) => c.startsWith(`${getReferralCookieName()}=`))

  if (!referralCookie) return null

  return referralCookie.split('=')[1] || null
}

