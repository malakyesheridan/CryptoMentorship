/**
 * Pure utility functions for content that can be used in client components
 * These functions don't use Prisma and are safe to import in 'use client' components
 */

import { formatDate } from './dates'

export type MembershipTier = 'T1' | 'T2' | 'T3'

export function canViewContent(userRole: string, userTier: string | null, contentMinTier: string | null, contentLocked: boolean): boolean {
  // Admins can view everything
  if (userRole === 'admin') return true
  
  // If content is locked, check tier requirements
  if (contentLocked && contentMinTier) {
    if (!userTier) return false
    
    const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 }
    const userTierLevel = tierOrder[userTier as MembershipTier] || 0
    const requiredTierLevel = tierOrder[contentMinTier as MembershipTier] || 0
    
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

