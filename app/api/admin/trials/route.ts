import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { onTrialStarted } from '@/lib/membership/trial'

const createTrialSchema = z.object({
  userId: z.string(),
  tier: z.enum(['T1', 'T2']).default('T2'), // Default to T2 (Elite) for all trial accounts
  trialEndDate: z.string().optional(),
  durationDays: z.number().min(1).max(365).optional(), // Backward-compatible fallback
})

/**
 * POST /api/admin/trials
 * Create a trial subscription for an existing user
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin access
    const admin = await requireAdmin()
    
    const body = await req.json()
    const { userId, tier, trialEndDate: trialEndDateInput, durationDays } = createTrialSchema.parse(body)
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Check if user already has a membership
    const existingMembership = await prisma.membership.findUnique({
      where: { userId },
      select: { currentPeriodEnd: true, currentPeriodStart: true },
    })
    
    const now = new Date()
    const isExtension = !!(existingMembership?.currentPeriodEnd && existingMembership.currentPeriodEnd > now)

    // Calculate trial end date.
    // Preferred path: explicit target date from admin date picker.
    // Fallback path: durationDays (legacy callers).
    let trialEndDate: Date
    let trialStartDate: Date

    if (isExtension) {
      // Keep the original start date when extending
      trialStartDate = existingMembership?.currentPeriodStart || now
    } else {
      // New trial or previously expired membership starts today
      trialStartDate = now
    }

    if (trialEndDateInput) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trialEndDateInput)
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid trial end date. Use YYYY-MM-DD.' },
          { status: 400 }
        )
      }
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const parsedDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day
      ) {
        return NextResponse.json(
          { error: 'Invalid trial end date. Use a real calendar date.' },
          { status: 400 }
        )
      }

      if (parsedDate <= now) {
        return NextResponse.json(
          { error: 'Trial end date must be in the future.' },
          { status: 400 }
        )
      }

      if (isExtension && existingMembership?.currentPeriodEnd && parsedDate <= existingMembership.currentPeriodEnd) {
        return NextResponse.json(
          { error: 'Extension date must be after the current trial end date.' },
          { status: 400 }
        )
      }

      trialEndDate = parsedDate
    } else {
      const safeDurationDays = durationDays ?? 30
      if (isExtension && existingMembership?.currentPeriodEnd) {
        trialEndDate = new Date(existingMembership.currentPeriodEnd)
        trialEndDate.setDate(trialEndDate.getDate() + safeDurationDays)
      } else {
        trialEndDate = new Date(now)
        trialEndDate.setDate(trialEndDate.getDate() + safeDurationDays)
      }
    }
    
    // Get or create membership
    const membership = await prisma.membership.upsert({
      where: { userId },
      update: {
        tier,
        status: 'trial', // Trial status - only paying users should have 'active' status
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate,
        // Clear Stripe subscription if exists (trial is manual/managed)
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
      create: {
        userId,
        tier,
        status: 'trial', // Trial status - only paying users should have 'active' status
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate,
      },
    })

    if (user.role === 'guest') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'member' },
      })
    }
    
    logger.info(isExtension ? 'Trial subscription extended' : 'Trial subscription created', {
      userId,
      userEmail: user.email,
      tier,
      trialEndDateInput: trialEndDateInput || null,
      durationDays: durationDays ?? null,
      trialEndDate: trialEndDate.toISOString(),
      trialStartDate: trialStartDate.toISOString(),
      previousEndDate: existingMembership?.currentPeriodEnd?.toISOString() || null,
      isExtension,
      createdBy: admin.id,
      createdByEmail: admin.email,
    })
    
    // Enqueue trial welcome email (non-blocking, idempotent)
    try {
      await onTrialStarted({
        userId,
        membership: {
          status: membership.status,
          currentPeriodEnd: membership.currentPeriodEnd,
          currentPeriodStart: membership.currentPeriodStart,
          tier: membership.tier,
        },
        user: { email: user.email, name: user.name },
        source: isExtension ? 'admin-trial-extend' : 'admin-trial-create',
      })
    } catch (emailError) {
      logger.error(
        'Failed to enqueue trial welcome email',
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { userId, userEmail: user.email }
      )
    }
    
    return NextResponse.json({
      success: true,
      membership: {
        id: membership.id,
        tier: membership.tier,
        status: membership.status,
        currentPeriodStart: membership.currentPeriodStart?.toISOString(),
        currentPeriodEnd: membership.currentPeriodEnd?.toISOString(),
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    logger.error(
      'Failed to create trial subscription',
      error instanceof Error ? error : new Error(String(error))
    )
    
    return NextResponse.json(
      { error: 'Failed to create trial subscription' },
      { status: 500 }
    )
  }
}

