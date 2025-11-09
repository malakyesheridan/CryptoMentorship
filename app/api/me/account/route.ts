import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Force dynamic rendering since this uses authentication headers
export const dynamic = 'force-dynamic'

/**
 * GET /api/me/account
 * Get current user's account information including membership details
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()

    // Fetch user with membership data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        loginCount: true,
        isActive: true,
        profileCompleted: true,
        onboardingCompleted: true,
      },
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch membership data
    const membership = await prisma.membership.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        tier: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })

    return NextResponse.json({
      user: userData,
      membership: membership || null,
    })
  } catch (error) {
    logger.error(
      'Get account data error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'Failed to get account data' },
      { status: 500 }
    )
  }
}

