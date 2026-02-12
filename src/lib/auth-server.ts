import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export { authOptions }
export { prisma }

export function isAdminOrEditorRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'editor'
}

function normalizeRequiredRoles(roleOrPredicate: string | string[]) {
  if (typeof roleOrPredicate === 'string') {
    return roleOrPredicate === 'admin' ? ['admin', 'editor'] : [roleOrPredicate]
  }
  const roles = new Set(roleOrPredicate)
  if (roles.has('admin')) {
    roles.add('editor')
  }
  return Array.from(roles)
}

export async function getSession() {
  const session = await getServerSession(authOptions)
  
  // Development bypass: only for demo users in development
  if (process.env.NODE_ENV === 'development' && session?.user?.email?.includes('demo-')) {
    return {
      ...session,
      user: {
        ...session.user,
        role: session.user.email.includes('demo-admin') ? 'admin' : 'member',
        membershipTier: 'T2' // All demo users get T2 (Elite) access
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
  } else {
    const allowedRoles = normalizeRequiredRoles(roleOrPredicate)
    if (!allowedRoles.includes(user.role)) {
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
  } else {
    hasRole = normalizeRequiredRoles(roleOrPredicate).includes(user.role)
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
      return isAdminOrEditorRole(user.role)
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
 * Require admin-equivalent access for API routes
 * Throws NextResponse error if user is not admin/editor
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
  
  if (!user || !isAdminOrEditorRole(user.role)) {
    throw NextResponse.json(
      { error: 'Admin or editor access required' },
      { status: 403 }
    ) as any
  }
  
  return user
}
