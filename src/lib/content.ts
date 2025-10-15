import { prisma } from '@/lib/prisma'
import { formatDate } from './dates'
import { getPaginationOffset, createPaginationResult } from './pagination'

export type ContentKind = 'research' | 'macro' | 'signal' | 'resource'
export type MembershipTier = 'T1' | 'T2' | 'T3'

export interface ContentFilters {
  kind?: ContentKind
  search?: string
  tags?: string[]
  locked?: boolean
  minTier?: MembershipTier
  page?: number
  limit?: number
}

export async function getContent(filters: ContentFilters = {}) {
  const where: any = {}
  
  if (filters.kind) {
    where.kind = filters.kind
  }
  
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { excerpt: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } }
    ]
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags }
  }
  
  if (filters.locked !== undefined) {
    where.locked = filters.locked
  }
  
  if (filters.minTier) {
    where.minTier = filters.minTier
  }

  // Handle pagination
  const page = filters.page || 1
  const limit = filters.limit || 12
  const skip = getPaginationOffset(page, limit)

  // Get total count for pagination
  const total = await prisma.content.count({ where })

  // Get paginated results
  const data = await prisma.content.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true,
      kind: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      locked: true,
    }
  })

  // Return paginated result if pagination is requested
  if (filters.page || filters.limit) {
    return createPaginationResult(data, page, limit, total)
  }

  // Return simple array for backward compatibility
  return data
}

export async function getContentById(id: string) {
  return await prisma.content.findUnique({
    where: { id },
    include: {
      // Add any relations if needed
    }
  })
}

export async function getContentBySlug(slug: string) {
  return await prisma.content.findUnique({
    where: { slug },
    include: {
      // Add any relations if needed
    }
  })
}

export async function getEpisodes(filters: { locked?: boolean } = {}) {
  const where: any = {}
  
  if (filters.locked !== undefined) {
    where.locked = filters.locked
  }

  return await prisma.episode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      locked: true,
      createdAt: true,
    }
  })
}

export async function getEpisodeById(id: string) {
  return await prisma.episode.findUnique({
    where: { id }
  })
}

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
