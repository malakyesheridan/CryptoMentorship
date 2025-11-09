import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

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
    
    // Store token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: dbUser.email,
          token: token,
        },
      },
      update: {
        token: token,
        expires: expires,
      },
      create: {
        identifier: dbUser.email,
        token: token,
        expires: expires,
      },
    })
    
    // TODO: Send verification email
    // For now, just log it (in development)
    if (env.NODE_ENV === 'development') {
      logger.info('Verification token generated', {
        email: dbUser.email,
        token, // Only log in development
        verifyUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:5001'}/verify-email?token=${token}`,
      })
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

