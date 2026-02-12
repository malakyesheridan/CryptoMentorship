import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'

export interface ClientData {
  name: string
  slug: string
  description?: string
  domain?: string
  settings?: Record<string, any>
}

export async function createClient(data: ClientData) {
  const user = await requireUser()
  
  // Only admins/editors can create clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can create clients')
  }

  const client = await prisma.client.create({
    data: {
      ...data,
      settings: data.settings ? JSON.stringify(data.settings) : null,
    }
  })

  return client
}

export async function getClient(clientId: string) {
  return await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        }
      }
    }
  })
}

export async function getClientBySlug(slug: string) {
  return await prisma.client.findUnique({
    where: { slug },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        }
      }
    }
  })
}

export async function getAllClients() {
  const user = await requireUser()
  
  // Only admins/editors can see all clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can view all clients')
  }

  return await prisma.client.findMany({
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        }
      },
      _count: {
        select: {
          users: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateClient(clientId: string, data: Partial<ClientData>) {
  const user = await requireUser()
  
  // Only admins/editors can update clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can update clients')
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...data,
      settings: data.settings ? JSON.stringify(data.settings) : undefined,
    }
  })

  return client
}

export async function deleteClient(clientId: string) {
  const user = await requireUser()
  
  // Only admins/editors can delete clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can delete clients')
  }

  // First, remove all users from this client
  await prisma.user.updateMany({
    where: { clientId },
    data: { clientId: null }
  })

  // Then delete the client
  await prisma.client.delete({
    where: { id: clientId }
  })

  return { success: true }
}

export async function assignUserToClient(userId: string, clientId: string) {
  const user = await requireUser()
  
  // Only admins/editors can assign users to clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can assign users to clients')
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { clientId },
    include: {
      client: true
    }
  })

  return updatedUser
}

export async function removeUserFromClient(userId: string) {
  const user = await requireUser()
  
  // Only admins/editors can remove users from clients
  if (!['admin', 'editor'].includes(user.role)) {
    throw new Error('Only admins or editors can remove users from clients')
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { clientId: null }
  })

  return updatedUser
}

export async function getClientUsers(clientId: string) {
  const user = await requireUser()
  
  // Users can only see users from their own client
  if (!['admin', 'editor'].includes(user.role) && (user as any).clientId !== clientId) {
    throw new Error('You can only view users from your own client')
  }

  return await prisma.user.findMany({
    where: { clientId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      profileCompleted: true,
      onboardingCompleted: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getClientStats(clientId: string) {
  const user = await requireUser()
  
  // Users can only see stats from their own client
  if (!['admin', 'editor'].includes(user.role) && (user as any).clientId !== clientId) {
    throw new Error('You can only view stats from your own client')
  }

  const [
    totalUsers,
    activeUsers,
    completedOnboarding,
    learningProgress,
    contentEngagement
  ] = await Promise.all([
    prisma.user.count({ where: { clientId } }),
    prisma.user.count({ where: { clientId, isActive: true } }),
    prisma.user.count({ where: { clientId, onboardingCompleted: true } }),
    prisma.enrollment.count({ 
      where: { 
        user: { clientId },
        completedAt: { not: null }
      }
    }),
    prisma.viewEvent.count({
      where: {
        user: { clientId }
      }
    })
  ])

  return {
    totalUsers,
    activeUsers,
    completedOnboarding,
    learningProgress,
    contentEngagement,
    completionRate: totalUsers > 0 ? Math.round((completedOnboarding / totalUsers) * 100) : 0
  }
}
