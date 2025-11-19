import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { getOrCreateReferralCode } from '@/lib/referrals'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!referralConfig.enabled) {
      return NextResponse.json(
        { error: 'Referral system is disabled' },
        { status: 503 }
      )
    }

    const referralCode = await getOrCreateReferralCode(session.user.id)
    const affiliateLink = `${referralConfig.appUrl}/register?ref=${referralCode}`

    return NextResponse.json({
      referralCode,
      affiliateLink,
    })
  } catch (error) {
    logger.error(
      'Failed to generate referral code',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

