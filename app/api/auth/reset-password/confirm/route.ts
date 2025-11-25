import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const confirmSchema = z.object({
  token: z.string().min(1, 'Token is required').regex(/^[a-f0-9]{64}$/, 'Invalid token format'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = confirmSchema.parse(body)
    
    const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    
    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      logger.warn('Password reset attempt with weak password', { ip, timestamp: new Date().toISOString() })
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }
    
    // Find token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })
    
    if (!verificationToken) {
      logger.warn('Password reset attempt with invalid token', { ip, timestamp: new Date().toISOString() })
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      )
    }
    
    // Check expiry
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      logger.warn('Password reset attempt with expired token', { 
        email: verificationToken.identifier,
        ip,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset link.' },
        { status: 400 }
      )
    }
    
    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { id: true, email: true },
    })
    
    if (!user) {
      logger.error('Password reset token exists but user not found', undefined, { 
        email: verificationToken.identifier,
        token: token.substring(0, 8) + '...', // Only log first 8 chars for security
        ip,
      })
      // Delete orphaned token
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password)
    
    // Update password and invalidate all tokens in transaction (atomic operation)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
      
      // Delete the used token
      await tx.verificationToken.delete({
        where: { token },
      })
      
      // Delete any other reset tokens for this user (security: prevent reuse)
      await tx.verificationToken.deleteMany({
        where: {
          identifier: user.email,
          expires: { gte: new Date() },
        },
      })
    })
    
    // Security audit log
    logger.info('Password reset completed successfully', { 
      userId: user.id,
      email: user.email,
      ip,
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    
    logger.error(
      'Password reset confirmation error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

