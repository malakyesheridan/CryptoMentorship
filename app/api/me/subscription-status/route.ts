import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'

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
    
    const isActive = await hasActiveSubscription(user.id)
    
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

