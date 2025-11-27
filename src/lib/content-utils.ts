/**
 * Pure utility functions for content that can be used in client components
 * These functions don't use Prisma and are safe to import in 'use client' components
 */

import { formatDate } from './dates'

export type MembershipTier = 'T1' | 'T2'

// Map old tiers to new tiers
function mapTier(tier: string | null): string | null {
  if (!tier) return null
  if (tier === 'T3') return 'T2' // Old T3 → new T2 (Elite)
  if (tier === 'T2') return 'T1' // Old T2 → new T1 (Growth)
  if (tier === 'T1') return null // Old T1 → removed (no access)
  return tier
}

export function canViewContent(userRole: string, userTier: string | null, contentMinTier: string | null, contentLocked: boolean): boolean {
  // Admins can view everything
  if (userRole === 'admin') return true
  
  // If content is locked, check tier requirements
  if (contentLocked && contentMinTier) {
    if (!userTier) return false
    
    // Map both tiers to new structure
    const mappedUserTier = mapTier(userTier)
    const mappedContentTier = mapTier(contentMinTier)
    
    // Old T1 users have no access
    if (!mappedUserTier) return false
    
    const tierOrder = { 'T1': 1, 'T2': 2 }
    const userTierLevel = tierOrder[mappedUserTier as MembershipTier] || 0
    const requiredTierLevel = tierOrder[mappedContentTier as MembershipTier] || 0
    
    return userTierLevel >= requiredTierLevel
  }
  
  // If not locked or no tier requirement, anyone can view
  return true
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatContentDate(date: Date | string | number) {
  return formatDate(date, 'MMM d, yyyy')
}

