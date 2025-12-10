import { redirect } from 'next/navigation'
import { validateReferralCode } from '@/lib/referrals'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

// Revalidate every 60 seconds - referral links need to be relatively fresh
export const revalidate = 60

interface SlugPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Root-level referral slug handler
 * Route: /[slug]
 * Checks if slug is a referral slug, if so redirects to /register?ref=[slug]
 * This allows format: domain.com/example
 */
export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params
  
  // Skip common routes that shouldn't be treated as referral slugs
  const reservedRoutes = [
    'api', 'admin', 'login', 'register', 'subscribe', 'ref', 'content',
    'crypto-compass', 'portfolio', 'learn', 'events', 'community',
    'dashboard', 'account', 'notifications', 'me', 'videos', 'robots.txt',
    'sitemap.xml', 'favicon.ico', '_next', 'static'
  ]
  
  if (reservedRoutes.includes(slug.toLowerCase())) {
    // Not a referral slug, let Next.js handle it normally
    redirect('/login')
  }
  
  try {
    // Validate referral code (slug)
    const validation = await validateReferralCode(slug)
    
    if (!validation.valid) {
      logger.warn('Invalid referral slug accessed', { slug, error: validation.error })
      // Redirect to register page without referral code
      redirect('/register')
    }

    // Set referral cookie for tracking (even if user doesn't sign up immediately)
    const cookieStore = await cookies()
    cookieStore.set('referral_code', slug, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      httpOnly: false, // Allow client-side access for registration form
    })

    logger.info('Referral slug accessed', {
      slug,
      referrerId: validation.referral?.referrerId,
    })

    // Redirect to register page with referral code
    redirect(`/register?ref=${slug}`)
  } catch (error) {
    logger.error(
      'Error processing referral slug',
      error instanceof Error ? error : new Error(String(error)),
      { slug }
    )
    // On error, redirect to register page without referral code
    redirect('/register')
  }
}

