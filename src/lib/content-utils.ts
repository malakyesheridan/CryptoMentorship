/**
 * Pure utility functions for content that can be used in client components
 * These functions don't use Prisma and are safe to import in 'use client' components
 */

import { formatDate } from './dates'

/**
 * Single-tier model: locked content is visible to anyone with an active
 * subscription. The `contentMinTier` argument is retained for call-site
 * compatibility but ignored.
 */
export function canViewContent(
  userRole: string,
  userTier: string | null,
  _contentMinTier: string | null,
  contentLocked: boolean,
): boolean {
  if (userRole === 'admin' || userRole === 'editor') return true
  if (!contentLocked) return true
  return Boolean(userTier)
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

