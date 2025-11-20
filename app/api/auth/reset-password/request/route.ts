import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { env } from '@/lib/env'
import { sendPasswordResetEmail } from '@/lib/email'

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
      select: { id: true, email: true, name: true },
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
    
    // Generate reset URL
    const baseUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:5001'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`
    
    // Send reset email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userName: user.name,
      })
      logger.info('Password reset email sent', { email, userId: user.id })
    } catch (emailError) {
      // Log error but don't fail the request (security: don't reveal if email failed)
      logger.error('Failed to send password reset email', emailError instanceof Error ? emailError : new Error(String(emailError)))
      
      // In development, still log the token for testing
      if (env.NODE_ENV === 'development') {
        logger.info('Password reset token generated (email failed)', {
          email,
          token, // Only log in development
          resetUrl,
        })
      }
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

