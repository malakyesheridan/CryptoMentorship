import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(2).max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = registerSchema.parse(body)

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

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

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user and membership in transaction
    const { user, membership } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: 'member',
          emailVerified: null, // Require email verification
        },
      })

      const newMembership = await tx.membership.create({
        data: {
          userId: newUser.id,
          tier: 'T1',
          status: 'trial',
        },
      })

      return { user: newUser, membership: newMembership }
    })

    logger.info('User registered', { userId: user.id, email })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    logger.error(
      'Registration error',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

