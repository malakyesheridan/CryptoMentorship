import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { onTrialStarted } from '@/lib/membership/trial'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2).max(100).optional(),
  tier: z.enum(['T1', 'T2']).default('T2'), // Default to T2 (Elite) for all trial accounts
  durationDays: z.number().min(1).max(365).default(30), // Default 30 days (1 month)
})

/**
 * Generate a secure random password
 */
function generateTemporaryPassword(): string {
  // Generate 16 character password with mix of uppercase, lowercase, numbers, and symbols
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols
  
  let password = ''
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * POST /api/admin/users/create
 * Create a new user account with trial subscription
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin access
    const admin = await requireAdmin()
    
    const body = await req.json()
    const { email, name, tier, durationDays } = createUserSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    
    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)
    
    // Calculate trial end date
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + durationDays)
    
    // Create user and membership in transaction
    const { user, membership } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: 'member', // Trial users should be members
          emailVerified: new Date(), // Auto-verify for admin-created accounts
        },
      })
      
      const newMembership = await tx.membership.create({
        data: {
          userId: newUser.id,
          tier,
          status: 'trial', // Trial status - only paying users should have 'active' status
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        },
      })
      
      return { user: newUser, membership: newMembership }
    })
    
    logger.info('User created with trial subscription', {
      userId: user.id,
      userEmail: user.email,
      tier,
      durationDays,
      trialEndDate: trialEndDate.toISOString(),
      createdBy: admin.id,
      createdByEmail: admin.email,
    })
    
    // Enqueue trial welcome email (non-blocking, idempotent)
    try {
      await onTrialStarted({
        userId: user.id,
        membership: {
          status: membership.status,
          currentPeriodEnd: membership.currentPeriodEnd,
          currentPeriodStart: membership.currentPeriodStart,
          tier: membership.tier,
        },
        user: { email: user.email, name: user.name },
        source: 'admin-user-create',
      })
    } catch (emailError) {
      logger.error(
        'Failed to enqueue trial welcome email',
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { userId: user.id, userEmail: user.email }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      membership: {
        id: membership.id,
        tier: membership.tier,
        status: membership.status,
        currentPeriodStart: membership.currentPeriodStart?.toISOString(),
        currentPeriodEnd: membership.currentPeriodEnd?.toISOString(),
      },
      temporaryPassword, // Return password so admin can share it with user
      // Security note: In production, consider sending password via secure channel
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    logger.error(
      'Failed to create user with trial',
      error instanceof Error ? error : new Error(String(error))
    )
    
    return NextResponse.json(
      { error: 'Failed to create user with trial' },
      { status: 500 }
    )
  }
}

