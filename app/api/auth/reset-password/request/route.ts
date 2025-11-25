import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { env } from '@/lib/env'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkPasswordResetRateLimit } from '@/lib/rate-limit-password-reset'

const requestSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = requestSchema.parse(body)
    
    // Get IP address for rate limiting and logging
    const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    
    // Rate limiting: Check both email and IP limits
    const rateLimitCheck = checkPasswordResetRateLimit(email, ip)
    if (!rateLimitCheck.allowed) {
      // Return same message as if user doesn't exist (security best practice)
      // Log the rate limit violation for security monitoring
      logger.warn('Password reset rate limit exceeded', { email, ip, timestamp: new Date().toISOString() })
      return NextResponse.json(
        {
          message: 'If an account exists with this email, a password reset link has been sent.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '3600',
          },
        }
      )
    }
    
    // Check if user exists (don't reveal if not)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    })
    
    if (!user) {
      // Don't reveal if email exists - security best practice
      // Log for security monitoring (but don't reveal to user)
      logger.info('Password reset requested for non-existent email', { email, ip, timestamp: new Date().toISOString() })
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }
    
    // Invalidate any existing reset tokens for this user (security: prevent token reuse)
    // Only delete tokens that haven't expired yet (active tokens)
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        expires: { gte: new Date() },
      },
    })
    
    // Generate cryptographically secure reset token
    const token = randomBytes(32).toString('hex')
    const expires = new Date()
    expires.setHours(expires.getHours() + 1) // 1 hour expiry
    
    // Store token (using NextAuth's VerificationToken model)
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: token,
        expires: expires,
      },
    })
    
    // Generate reset URL with token
    const baseUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:5001'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`
    
    // Send reset email
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userName: user.name,
      })
      logger.info('Password reset email sent', { 
        email, 
        userId: user.id,
        ip,
        timestamp: new Date().toISOString(),
      })
    } catch (emailError) {
      // Log error but don't fail the request (security: don't reveal if email failed)
      logger.error('Failed to send password reset email', 
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { email, userId: user.id, ip }
      )
      
      // In development, still log the token for testing
      if (env.NODE_ENV === 'development') {
        logger.info('Password reset token generated (email failed)', {
          email,
          token, // Only log in development
          resetUrl,
        })
      }
    }
    
    // Security audit log
    logger.info('Password reset requested', { 
      email, 
      userId: user.id,
      ip,
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    logger.error(
      'Password reset request error',
      error instanceof Error ? error : new Error(String(error))
    )
    // Don't reveal errors to prevent enumeration
    return NextResponse.json(
      { message: 'If an account exists with this email, a password reset link has been sent.' },
      { status: 200 }
    )
  }
}

