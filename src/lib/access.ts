import { prisma } from '@/lib/prisma'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

type AccessMode = 'page' | 'api'

/**
 * Check if user has an active subscription
 * Validates membership status, subscription period, and Stripe subscription status
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const membership = await prisma.membership.findFirst({
      where: { userId },
    })
    
    if (!membership) {
      return false
    }
    
    // Check membership status - allow both 'active' and 'trial' status
    // Trial memberships are active subscriptions with expiration dates
    if (membership.status !== 'active' && membership.status !== 'trial') {
      return false
    }

    // Trials must have an end date; treat missing end as inactive
    if (membership.status === 'trial' && !membership.currentPeriodEnd) {
      return false
    }
    
    // Check subscription end date (applies to both active and trial)
    if (membership.currentPeriodEnd && membership.currentPeriodEnd < new Date()) {
      return false
    }
    
    // If Stripe subscription exists and Stripe is configured, verify it's active
    if (membership.stripeSubscriptionId && isStripeConfigured()) {
      try {
        if (!stripe) {
          return false
        }
        
        const subscription = await stripe.subscriptions.retrieve(
          membership.stripeSubscriptionId
        )
        
        return subscription.status === 'active' || subscription.status === 'trialing'
      } catch (error) {
        // If subscription not found in Stripe, log but don't fail
        // This could happen if subscription was deleted externally
        logger.warn('Stripe subscription not found', {
          userId,
          subscriptionId: membership.stripeSubscriptionId,
        })
        // Fall back to membership status check
        return membership.status === 'active' || membership.status === 'trial'
      }
    }
    
    // No Stripe subscription - check membership status only
    // This allows backward compatibility with non-Stripe memberships
    // Allow both 'active' and 'trial' status
    return membership.status === 'active' || membership.status === 'trial'
  } catch (error) {
    logger.error(
      'Error checking active subscription',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    )
    // Fail closed - assume no access on error
    return false
  }
}

/**
 * Check if user can access a specific tier
 * Validates both subscription status and tier level
 */
export async function canAccessTier(userId: string, requiredTier: string): Promise<boolean> {
  try {
    // Check if subscription is active first
    const isActive = await hasActiveSubscription(userId)
    if (!isActive) {
      return false
    }
    
    const membership = await prisma.membership.findFirst({
      where: { userId },
    })
    
    if (!membership) {
      return false
    }
    
    // Check tier access
    // Map old tiers to new: T1→removed, T2→T1, T3→T2
    const mapTier = (tier: string): string => {
      if (tier === 'T3') return 'T2' // Old T3 → new T2 (Elite)
      if (tier === 'T2') return 'T1' // Old T2 → new T1 (Growth)
      if (tier === 'T1') return '' // Old T1 → removed (no access)
      return tier
    }
    
    const mappedUserTier = mapTier(membership.tier)
    const mappedRequiredTier = mapTier(requiredTier)
    
    // Old T1 users have no access
    if (!mappedUserTier) return false
    
    const tierHierarchy = ['T1', 'T2']
    const userTierIndex = tierHierarchy.indexOf(mappedUserTier)
    const requiredTierIndex = tierHierarchy.indexOf(mappedRequiredTier)
    
    // If tier not found in hierarchy, deny access
    if (userTierIndex === -1 || requiredTierIndex === -1) {
      return false
    }
    
    return userTierIndex >= requiredTierIndex
  } catch (error) {
    logger.error(
      'Error checking tier access',
      error instanceof Error ? error : new Error(String(error)),
      { userId, requiredTier }
    )
    // Fail closed - assume no access on error
    return false
  }
}

/**
 * Get user's membership information including subscription status
 */
export async function getUserMembership(userId: string) {
  try {
    const membership = await prisma.membership.findFirst({
      where: { userId },
    })
    
    if (!membership) {
      return null
    }
    
    const isActive = await hasActiveSubscription(userId)
    
    return {
      ...membership,
      isActive,
      canAccess: isActive,
    }
  } catch (error) {
    logger.error(
      'Error getting user membership',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    )
    return null
  }
}

export async function requireAuth(mode: AccessMode = 'page') {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    if (mode === 'api') {
      throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any
    }
    redirect('/login')
  }

  return session.user
}

export async function requireActiveSubscription(mode: AccessMode = 'page') {
  const user = await requireAuth(mode)
  const isActive = await hasActiveSubscription(user.id)

  if (!isActive) {
    if (mode === 'api') {
      throw NextResponse.json({ error: 'Subscription required' }, { status: 403 }) as any
    }
    redirect('/subscribe?required=true')
  }

  return user
}

export async function requireTier(requiredTier: string, mode: AccessMode = 'page') {
  const user = await requireActiveSubscription(mode)
  const canAccess = await canAccessTier(user.id, requiredTier)

  if (!canAccess) {
    if (mode === 'api') {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as any
    }
    redirect('/subscribe?required=true')
  }

  return user
}

