import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { onTrialStarted } from '@/lib/membership/trial'

const createTrialSchema = z.object({
  userId: z.string(),
  tier: z.enum(['T1', 'T2']).default('T2'), // Default to T2 (Elite) for all trial accounts
  durationDays: z.number().min(1).max(365).default(30), // Default 30 days (1 month)
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
    const { userId, tier, durationDays } = createTrialSchema.parse(body)
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
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
    
    // Calculate trial end date
    // If user has an existing membership with a future end date, extend from that date
    // Otherwise, calculate from today
    let trialEndDate: Date
    let trialStartDate: Date
    
    if (existingMembership?.currentPeriodEnd && existingMembership.currentPeriodEnd > new Date()) {
      // Extend from existing end date
      trialEndDate = new Date(existingMembership.currentPeriodEnd)
      trialEndDate.setDate(trialEndDate.getDate() + durationDays)
      // Keep the original start date when extending
      trialStartDate = existingMembership.currentPeriodStart || new Date()
    } else {
      // Create new trial or extend from expired date - start from today
      trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + durationDays)
      trialStartDate = new Date()
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
    
    const isExtension = !!(existingMembership?.currentPeriodEnd && existingMembership.currentPeriodEnd > new Date())
    
    logger.info(isExtension ? 'Trial subscription extended' : 'Trial subscription created', {
      userId,
      userEmail: user.email,
      tier,
      durationDays,
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

