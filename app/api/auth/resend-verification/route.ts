import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    
    // Check if already verified
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true, email: true },
    })
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    if (dbUser.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 400 }
      )
    }
    
    // Generate verification token
    const token = randomBytes(32).toString('hex')
    const expires = new Date()
    expires.setHours(expires.getHours() + 24) // 24 hour expiry
    
    // Remove any existing active tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: dbUser.email,
        expires: { gte: new Date() },
      },
    })

    // Store token
    await prisma.verificationToken.create({
      data: {
        identifier: dbUser.email,
        token: token,
        expires: expires,
      },
    })

    const baseUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:5001'
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`

    try {
      await sendVerificationEmail({
        to: dbUser.email,
        verifyUrl,
      })
    } catch (emailError) {
      logger.error(
        'Failed to send verification email (non-blocking)',
        emailError instanceof Error ? emailError : new Error(String(emailError)),
        { userId: user.id, email: dbUser.email }
      )
    }
    
    logger.info('Verification email requested', { userId: user.id })
    
    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox.',
    })
    
  } catch (error) {
    logger.error(
      'Resend verification error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

