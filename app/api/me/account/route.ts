import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Cache for 60 seconds - account data doesn't change frequently
export const revalidate = 60

const updateAccountBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or less'),
})

/**
 * GET /api/me/account
 * Get current user's account information including membership details
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    
    logger.info('Fetching account data', { userId: user.id, userEmail: user.email })

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
      logger.warn('User not found in database', { 
        userId: user.id, 
        userEmail: user.email,
        sessionUser: user 
      })
      return NextResponse.json(
        { 
          error: 'User not found',
          details: `User ID ${user.id} from session not found in database. This may indicate a session/database mismatch.`
        },
        { status: 404 }
      )
    }
    
    logger.info('User found, fetching membership', { userId: userData.id })

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(
      'Get account data error',
      error instanceof Error ? error : new Error(String(error)),
      {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage,
      }
    )
    
    // Return more detailed error in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: 'Failed to get account data',
          details: errorMessage,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to get account data' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/me/account
 * Update current user's account details
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()

    let body: unknown
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const parsed = updateAccountBody.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      )
    }

    const { name } = parsed.data

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    })

    logger.info('Updated account name', { userId: user.id })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(
      'Update account error',
      error instanceof Error ? error : new Error(String(error)),
      {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage,
      }
    )
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    )
  }
}

