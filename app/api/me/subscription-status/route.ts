import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'
import { unstable_cache } from 'next/cache'

// Revalidate every 60 seconds - subscription status doesn't change frequently
export const revalidate = 60

// Cache subscription status per user for 60 seconds
async function getSubscriptionStatusCached(userId: string): Promise<boolean> {
  return unstable_cache(
    async () => {
      return await hasActiveSubscription(userId)
    },
    [`subscription-status-${userId}`],
    { revalidate: 60 }
  )()
}

/**
 * Check if current user has an active subscription
 * Used by client-side subscription gate
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    
    // Admins bypass subscription requirements
    if (user.role === 'admin') {
      return NextResponse.json({
        hasActiveSubscription: true,
        userId: user.id,
        isAdmin: true,
      })
    }
    
    const isActive = await getSubscriptionStatusCached(user.id)
    
    return NextResponse.json({
      hasActiveSubscription: isActive,
      userId: user.id,
    })
  } catch (error) {
    // If user is not authenticated, return false
    return NextResponse.json(
      { hasActiveSubscription: false, error: 'Not authenticated' },
      { status: 401 }
    )
  }
}

