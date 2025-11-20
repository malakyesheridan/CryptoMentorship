import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export { authOptions }
export { prisma }

export async function getSession() {
  const session = await getServerSession(authOptions)
  
  // Development bypass: only for demo users in development
  if (process.env.NODE_ENV === 'development' && session?.user?.email?.includes('demo-')) {
    return {
      ...session,
      user: {
        ...session.user,
        role: session.user.email.includes('demo-admin') ? 'admin' : 'member',
        membershipTier: session.user.email.includes('demo-admin') ? 'T3' : 'T2'
      }
    }
  }
  
  return session
}

export async function requireUser() {
  const session = await getSession()
  
  if (!session?.user) {
    redirect('/login')
  }
  
  return session.user
}

export async function requireRole(roleOrPredicate: string | string[] | ((user: any) => boolean)) {
  const user = await requireUser()
  
  if (typeof roleOrPredicate === 'function') {
    if (!roleOrPredicate(user)) {
      redirect('/dashboard')
    }
  } else if (Array.isArray(roleOrPredicate)) {
    if (!roleOrPredicate.includes(user.role)) {
      redirect('/dashboard')
    }
  } else {
    if (user.role !== roleOrPredicate) {
      redirect('/dashboard')
    }
  }
  
  return user
}

/**
 * API-safe version of requireRole
 * Throws NextResponse errors that Next.js handles automatically
 * 
 * Usage:
 * ```typescript
 * try {
 *   const { user } = await requireRoleAPI(['admin', 'editor'])
 *   // Use user directly
 * } catch (error) {
 *   // Next.js handles the error automatically
 * }
 * ```
 */
export async function requireRoleAPI(
  roleOrPredicate: string | string[] | ((user: any) => boolean)
): Promise<{ user: any }> {
  const session = await getSession()
  
  if (!session?.user) {
    // Next.js will catch and return this as JSON response
    throw NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    ) as any
  }
  
  const user = session.user
  
  let hasRole = false
  
  if (typeof roleOrPredicate === 'function') {
    hasRole = roleOrPredicate(user)
  } else if (Array.isArray(roleOrPredicate)) {
    hasRole = roleOrPredicate.includes(user.role)
  } else {
    hasRole = user.role === roleOrPredicate
  }
  
  if (!hasRole) {
    // Next.js will catch and return this as JSON response
    throw NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    ) as any
  }
  
  return { user }
}

export function hasRole(user: any, role: 'guest' | 'member' | 'editor' | 'admin'): boolean {
  if (!user) return false
  
  switch (role) {
    case 'guest':
      return true
    case 'member':
      return ['member', 'editor', 'admin'].includes(user.role)
    case 'editor':
      return ['editor', 'admin'].includes(user.role)
    case 'admin':
      return user.role === 'admin'
    default:
      return false
  }
}

export function canView(content: { locked: boolean }, user: any): boolean {
  if (!content.locked) return true
  return hasRole(user, 'member')
}

export async function getUserWithMembership(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: true
    }
  })
}

/**
 * Require admin access for API routes
 * Throws NextResponse error if user is not admin
 */
export async function requireAdmin() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    throw NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    ) as any
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true, name: true },
  })
  
  if (!user || user.role !== 'admin') {
    throw NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    ) as any
  }
  
  return user
}