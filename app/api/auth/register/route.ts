import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'
import { linkReferralToUser } from '@/lib/referrals'
import { referralConfig } from '@/lib/env'
import { randomBytes } from 'crypto'
import { sendVerificationEmail } from '@/lib/email'
import { env } from '@/lib/env'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  name: z.string().min(2).max(100).optional(),
  referralCode: z.string().optional(), // Optional referral code
  trial: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, referralCode, trial } = registerSchema.parse(body)
    const shouldCreateTrial = Boolean(trial)
    const trialDurationDays = 30
    const trialEndDate = shouldCreateTrial ? new Date() : null
    if (trialEndDate) {
      trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays)
    }

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

    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date()
    verificationExpires.setHours(verificationExpires.getHours() + 24)

    // Create user, and optionally attach a trial membership
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: shouldCreateTrial ? 'guest' : 'member',
          emailVerified: null, // Require email verification
        },
      })

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: verificationExpires,
        },
      })

      if (shouldCreateTrial && trialEndDate) {
        await tx.membership.create({
          data: {
            userId: newUser.id,
            tier: 'T2',
            status: 'trial',
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndDate,
          },
        })
      }

      // Link referral if code provided (defensive: errors don't block registration)
      if (referralCode && referralConfig.enabled) {
        try {
          const referralResult = await linkReferralToUser(referralCode, newUser.id, tx)
          if (referralResult.success) {
            logger.info('Referral linked during registration', {
              userId: newUser.id,
              referralCode,
              referralId: referralResult.referralId,
            })
          } else {
            // Log but don't fail registration
            logger.warn('Referral linking failed during registration (non-blocking)', {
              userId: newUser.id,
              referralCode,
              error: referralResult.error,
            })
          }
        } catch (error) {
          // Log but don't fail registration - referral is optional
          logger.warn('Referral linking error during registration (non-blocking)', {
            error: error instanceof Error ? error.message : String(error),
            userId: newUser.id,
            referralCode,
          })
        }
      }

      return newUser
    })

    logger.info('User registered', { 
      userId: user.id, 
      email, 
      isTrial: shouldCreateTrial,
      trialEndDate: trialEndDate?.toISOString() || null,
    })

    try {
      const baseUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:5001'
      const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`
      await sendVerificationEmail({
        to: email,
        verifyUrl,
        userName: name || null,
      })
      logger.info('Verification email sent', { userId: user.id, email })
    } catch (emailError) {
      logger.error(
        'Failed to send verification email (non-blocking)',
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { userId: user.id, email }
      )
    }

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

