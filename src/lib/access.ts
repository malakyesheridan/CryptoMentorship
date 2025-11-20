import { prisma } from '@/lib/prisma'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { logger } from '@/lib/logger'

/**
 * Check if user has an active subscription
 * Validates membership status, subscription period, and Stripe subscription status
 * Admins bypass subscription requirements
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    // Check if user is admin - admins bypass subscription requirements
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    
    if (user?.role === 'admin') {
      return true
    }
    
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
 * Admins bypass tier requirements
 */
export async function canAccessTier(userId: string, requiredTier: string): Promise<boolean> {
  try {
    // Check if user is admin - admins bypass tier requirements
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    
    if (user?.role === 'admin') {
      return true
    }
    
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
    const tierHierarchy = ['T1', 'T2', 'T3']
    const userTierIndex = tierHierarchy.indexOf(membership.tier)
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier)
    
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

