import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validatePassword } from '@/lib/password-validation'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const confirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = confirmSchema.parse(body)
    
    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
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
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }
    
    // Check expiry
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }
    
    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password)
    
    // Update password and invalidate token in transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })
      
      await tx.verificationToken.delete({
        where: { token },
      })
    })
    
    logger.info('Password reset completed', { userId: user.id })
    
    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    })
    
  } catch (error) {
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

