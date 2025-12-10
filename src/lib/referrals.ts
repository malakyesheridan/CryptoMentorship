import { prisma } from '@/lib/prisma'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

/**
 * Generate a default referral slug for a user
 * Format: user{USER_ID_PREFIX}{RANDOM}
 * This is used as a fallback if the user hasn't set a custom slug
 */
export async function generateDefaultReferralSlug(userId: string): Promise<string> {
  if (!referralConfig.enabled) {
    throw new Error('Referral system is disabled')
  }

  const userPrefix = userId.slice(0, 6).toLowerCase()
  const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase()
  const slug = `user${userPrefix}${randomSuffix}`

  // Ensure uniqueness
  const existing = await prisma.user.findUnique({
    where: { referralSlug: slug },
    select: { id: true },
  })

  if (existing) {
    // Retry with additional randomness
    const extraRandom = Math.random().toString(36).substring(2, 4).toLowerCase()
    return `user${userPrefix}${randomSuffix}${extraRandom}`
  }

  return slug
}

/**
 * Get or generate a referral slug for a user
 * Returns the user's custom slug if set, otherwise generates a default one
 */
export async function getOrGenerateReferralSlug(userId: string): Promise<string> {
  if (!referralConfig.enabled) {
    throw new Error('Referral system is disabled')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralSlug: true },
  })

  if (user?.referralSlug) {
    return user.referralSlug
  }

  // Generate and save a default slug
  const slug = await generateDefaultReferralSlug(userId)
  await prisma.user.update({
    where: { id: userId },
    data: { referralSlug: slug },
  })

  return slug
}

/**
 * Get or create a referral code for a user
 * Uses the user's referral slug (custom or generated)
 * Returns existing master template code if one exists, otherwise creates a new one
 * The master template (status: 'pending', referredUserId: null) can be reused for multiple referrals
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  if (!referralConfig.enabled) {
    throw new Error('Referral system is disabled')
  }

  // Get or generate the user's referral slug
  const referralSlug = await getOrGenerateReferralSlug(userId)

  // Find the master template referral code (the reusable one)
  // This is the original record with status 'pending' and no referredUserId
  const masterReferral = await prisma.referral.findFirst({
    where: {
      referrerId: userId,
      status: 'pending',
      referredUserId: null, // Master template hasn't been used
      referralCode: referralSlug, // Use slug as the code
    },
    orderBy: { createdAt: 'asc' }, // Get the original one
  })

  if (masterReferral) {
    return masterReferral.referralCode
  }

  // Create new master template referral code using the slug
  const expiresAt = referralConfig.codeExpiryDays
    ? new Date(Date.now() + referralConfig.codeExpiryDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.referral.create({
    data: {
      referrerId: userId,
      referralCode: referralSlug, // Use slug as the code
      expiresAt,
      status: 'pending',
      referredUserId: null, // Master template
    },
  })

  return referralSlug
}

/**
 * Validate a referral code (slug or legacy code)
 * Returns true if code is valid and can be used
 * Supports both new slug format and legacy REF-* format for backward compatibility
 * Codes can be reused multiple times - we find the master template or any valid referral
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

  // Try to find user by referral slug first (new format)
  const userBySlug = await prisma.user.findUnique({
    where: { referralSlug: code },
    select: { id: true },
  })

  let referralCode = code
  let referrerId: string | null = null

  if (userBySlug) {
    // Found user by slug - use their ID as referrer
    referrerId = userBySlug.id
    // Look for referral records with this slug as the code
  } else {
    // Not a slug - could be legacy REF-* format
    // Check if any referral exists with this code
    const existingReferral = await prisma.referral.findFirst({
      where: { referralCode: code },
      orderBy: { createdAt: 'asc' },
      select: { referrerId: true },
    })

    if (existingReferral) {
      referrerId = existingReferral.referrerId
    } else {
      // Code doesn't exist
      return { valid: false, error: 'Invalid referral code' }
    }
  }

  if (!referrerId) {
    return { valid: false, error: 'Invalid referral code' }
  }

  // Find the master template (reusable one)
  let referral = await prisma.referral.findFirst({
    where: {
      referrerId: referrerId,
      referralCode: referralCode,
      status: 'pending',
      referredUserId: null, // Master template
    },
    orderBy: { createdAt: 'asc' },
  })

  // If no master template found, check if any referral with this code exists
  if (!referral) {
    referral = await prisma.referral.findFirst({
      where: {
        referrerId: referrerId,
        referralCode: referralCode,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!referral) {
      // Create a master template if using slug and none exists
      if (userBySlug) {
        const expiresAt = referralConfig.codeExpiryDays
          ? new Date(Date.now() + referralConfig.codeExpiryDays * 24 * 60 * 60 * 1000)
          : null

        referral = await prisma.referral.create({
          data: {
            referrerId: referrerId,
            referralCode: referralCode,
            expiresAt,
            status: 'pending',
            referredUserId: null,
          },
        })
      } else {
        return { valid: false, error: 'Invalid referral code' }
      }
    }

    // Check if cancelled
    if (referral.status === 'cancelled') {
      return { valid: false, error: 'Referral code has been cancelled' }
    }

    // Check expiration
    if (referral.expiresAt && referral.expiresAt < new Date()) {
      return { valid: false, error: 'Referral code has expired' }
    }

    // Code exists and is valid, but master template was already used
    // This is fine - we'll create a new record when linking
    return {
      valid: true,
      referral: {
        id: referral.id,
        referrerId: referral.referrerId,
        status: 'pending', // Treat as valid for reuse
      },
    }
  }

  // Master template found - validate it
  // Check if expired
  if (referral.expiresAt && referral.expiresAt < new Date()) {
    return { valid: false, error: 'Referral code has expired' }
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

    // Create a NEW referral record (don't update the existing one)
    // This allows the same code to be reused for multiple people
    // The master template stays as 'pending' for future use
    const newReferral = await prismaClient.referral.create({
      data: {
        referrerId: referral.referrerId, // Same referrer
        referralCode: referralCode, // Same code
        referredUserId: userId, // New user being referred
        status: 'completed',
        completedAt: new Date(),
        // Don't copy expiration - new records are already completed
        expiresAt: null,
      },
    })

    logger.info('Referral linked to user', {
      referralId: newReferral.id,
      referrerId: referral.referrerId,
      referredUserId: userId,
      referralCode,
    })

    return { success: true, referralId: newReferral.id }
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
 * Calculate commission amount based on payment type and tier
 * - Initial payment: 25% commission
 * - Recurring payment: 10% commission (based on tier)
 */
export function calculateCommission(
  paymentAmount: number,
  isInitial: boolean,
  tier?: 'T1' | 'T2' | 'T3'
): number {
  // 25% for initial payments, 10% for recurring payments
  const commissionRate = isInitial ? 0.25 : 0.10
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
 * 
 * @param userId - User who made the payment
 * @param paymentId - Payment record ID
 * @param paymentAmount - Payment amount in dollars
 * @param isInitial - Whether this is the initial payment (true) or recurring (false)
 * @param tier - User's subscription tier (T1, T2, or T3)
 */
export async function createCommissionIfReferred(
  userId: string,
  paymentId: string,
  paymentAmount: number,
  isInitial: boolean = false,
  tier?: 'T1' | 'T2' | 'T3'
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

    // Calculate commission with tiered rates
    const commissionAmount = calculateCommission(paymentAmount, isInitial, tier)

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        referralId: referral.id,
        paymentId,
        referrerId: referral.referrerId,
        amount: commissionAmount,
        currency: 'usd', // TODO: Get from payment if multi-currency
        status: 'pending',
        notes: isInitial
          ? `Initial payment commission (25%)`
          : `Recurring payment commission (10%) - Tier: ${tier || 'unknown'}`,
      },
    })

    logger.info('Commission created', {
      commissionId: commission.id,
      referralId: referral.id,
      referrerId: referral.referrerId,
      paymentId,
      amount: commissionAmount,
      isInitial,
      tier,
      rate: isInitial ? '25%' : '10%',
    })

    return { success: true, commissionId: commission.id }
  } catch (error) {
    // Log error but don't throw - payment processing should continue
    logger.error(
      'Failed to create commission (non-blocking)',
      error instanceof Error ? error : new Error(String(error)),
      { userId, paymentId, paymentAmount, isInitial, tier }
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

