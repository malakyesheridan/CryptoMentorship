import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const updateSlugSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Slug cannot start or end with a hyphen'
    })
    .refine((slug) => !slug.includes('--'), {
      message: 'Slug cannot contain consecutive hyphens'
    }),
})

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'api', 'admin', 'login', 'register', 'subscribe', 'ref', 'content',
  'crypto-compass', 'portfolio', 'learn', 'events', 'community',
  'dashboard', 'account', 'notifications', 'me', 'videos', 'robots',
  'sitemap', 'favicon', '_next', 'static', 'user', 'ref-'
]

// GET /api/referrals/slug - Get current referral slug
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!referralConfig.enabled) {
      return NextResponse.json(
        { error: 'Referral system is disabled' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralSlug: true },
    })

    return NextResponse.json({
      slug: user?.referralSlug || null,
    })
  } catch (error) {
    logger.error(
      'Failed to get referral slug',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

// PUT /api/referrals/slug - Update referral slug
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!referralConfig.enabled) {
      return NextResponse.json(
        { error: 'Referral system is disabled' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { slug } = updateSlugSchema.parse(body)

    // Check if slug is reserved
    const lowerSlug = slug.toLowerCase()
    if (RESERVED_SLUGS.some(reserved => lowerSlug === reserved || lowerSlug.startsWith(reserved))) {
      return NextResponse.json(
        { error: 'This slug is reserved and cannot be used' },
        { status: 400 }
      )
    }

    // Check if slug is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { referralSlug: lowerSlug },
      select: { id: true },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 400 }
      )
    }

    // Update user's referral slug
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referralSlug: lowerSlug },
    })

    // Update or create referral record with new slug
    // Find existing master template
    const existingReferral = await prisma.referral.findFirst({
      where: {
        referrerId: session.user.id,
        status: 'pending',
        referredUserId: null,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (existingReferral) {
      // Update existing referral code to new slug
      await prisma.referral.update({
        where: { id: existingReferral.id },
        data: { referralCode: lowerSlug },
      })
    } else {
      // Create new master template
      const expiresAt = referralConfig.codeExpiryDays
        ? new Date(Date.now() + referralConfig.codeExpiryDays * 24 * 60 * 60 * 1000)
        : null

      await prisma.referral.create({
        data: {
          referrerId: session.user.id,
          referralCode: lowerSlug,
          expiresAt,
          status: 'pending',
          referredUserId: null,
        },
      })
    }

    logger.info('Referral slug updated', {
      userId: session.user.id,
      slug: lowerSlug,
    })

    return NextResponse.json({
      success: true,
      slug: lowerSlug,
      message: 'Referral slug updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid slug format', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 400 }
      )
    }

    logger.error(
      'Failed to update referral slug',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

