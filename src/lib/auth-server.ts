import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
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
