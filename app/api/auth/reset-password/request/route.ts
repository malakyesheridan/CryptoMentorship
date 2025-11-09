import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { env } from '@/lib/env'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = requestSchema.parse(body)
    
    // TODO: Add rate limiting (5 requests per hour per email)
    
    // Check if user exists (don't reveal if not)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })
    
    if (!user) {
      // Don't reveal if email exists - security best practice
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }
    
    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expires = new Date()
    expires.setHours(expires.getHours() + 1) // 1 hour expiry
    
    // Store token (using NextAuth's VerificationToken model)
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
      update: {
        token: token,
        expires: expires,
      },
      create: {
        identifier: email,
        token: token,
        expires: expires,
      },
    })
    
    // TODO: Send reset email
    // For now, just log it (in development, you could log the token)
    if (env.NODE_ENV === 'development') {
      logger.info('Password reset token generated', {
        email,
        token, // Only log in development
        resetUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:5001'}/reset-password?token=${token}`,
      })
    }
    
    logger.info('Password reset requested', { email, userId: user.id })
    
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
    
  } catch (error) {
    logger.error(
      'Password reset request error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

