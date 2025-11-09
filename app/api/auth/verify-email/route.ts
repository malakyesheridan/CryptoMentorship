import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = verifySchema.parse(body)
    
    // Find token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }
    
    // Check expiry
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: 'Verification token has expired' },
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
    
    // Verify email and delete token in transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
      
      await tx.verificationToken.delete({
        where: { token },
      })
    })
    
    logger.info('Email verified', { userId: user.id })
    
    return NextResponse.json({
      message: 'Email verified successfully',
    })
    
  } catch (error) {
    logger.error(
      'Email verification error',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}

