import { NextRequest, NextResponse } from 'next/server'
import { validateReferralCode } from '@/lib/referrals'
import { referralConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    if (!referralConfig.enabled) {
      return NextResponse.json({
        valid: false,
        error: 'Referral system is disabled',
      })
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({
        valid: false,
        error: 'Referral code is required',
      })
    }

    const validation = await validateReferralCode(code)

    return NextResponse.json({
      valid: validation.valid,
      code: validation.valid ? code : undefined,
      error: validation.error,
    })
  } catch (error) {
    logger.error(
      'Failed to validate referral code',
      error instanceof Error ? error : new Error(String(error))
    )
    return handleError(error)
  }
}

