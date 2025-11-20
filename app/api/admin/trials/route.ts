import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createTrialSchema = z.object({
  userId: z.string(),
  tier: z.enum(['T1', 'T2', 'T3']),
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
    
    // Calculate trial end date
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + durationDays)
    
    // Get or create membership
    const membership = await prisma.membership.upsert({
      where: { userId },
      update: {
        tier,
        status: 'trial', // Trial status - only paying users should have 'active' status
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
        // Clear Stripe subscription if exists (trial is manual/managed)
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
      create: {
        userId,
        tier,
        status: 'trial', // Trial status - only paying users should have 'active' status
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate,
      },
    })
    
    logger.info('Trial subscription created', {
      userId,
      userEmail: user.email,
      tier,
      durationDays,
      trialEndDate: trialEndDate.toISOString(),
      createdBy: admin.id,
      createdByEmail: admin.email,
    })
    
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

