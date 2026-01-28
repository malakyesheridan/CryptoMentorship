import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { validateReferralCode } from '@/lib/referrals'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

// Revalidate every 60 seconds - referral links need to be relatively fresh
export const revalidate = 60

interface RefPageProps {
  params: Promise<{ code: string }>
}

/**
 * Short referral link handler
 * Route: /ref/[code]
 * Redirects to /register?ref=[code] and sets referral cookie
 */
export default async function RefPage({ params }: RefPageProps) {
  const { code } = await params
  
  try {
    // Validate referral code
    const validation = await validateReferralCode(code)
    
    if (!validation.valid) {
      logger.warn('Invalid referral code accessed', { code, error: validation.error })
      // Redirect to register page without referral code
      redirect('/register')
    }

    // Set referral cookie for tracking (even if user doesn't sign up immediately)
    const cookieStore = await cookies()
    cookieStore.set('referral_code', code, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      httpOnly: false, // Allow client-side access for registration form
    })
    cookieStore.set('referral_clicked_at', new Date().toISOString(), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: false,
    })

    logger.info('Referral link accessed', {
      code,
      referrerId: validation.referral?.referrerId,
    })

    // Redirect to register page with referral code
    redirect(`/register?ref=${code}`)
  } catch (error) {
    logger.error(
      'Error processing referral link',
      error instanceof Error ? error : new Error(String(error)),
      { code }
    )
    // On error, redirect to register page without referral code
    redirect('/register')
  }
}

