import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-server'

export interface OnboardingData {
  clientName: string
  clientSlug: string
  clientDescription?: string
  clientDomain?: string
  adminEmail: string
  adminName: string
  adminPassword?: string
  settings?: Record<string, any>
}

export async function createClientWithAdmin(data: OnboardingData) {
  const currentUser = await requireUser()
  
  // Only admins can create new clients
  if (currentUser.role !== 'admin') {
    throw new Error('Only admins can create new clients')
  }

  // Check if client slug already exists
  const existingClient = await prisma.client.findUnique({
    where: { slug: data.clientSlug }
  })

  if (existingClient) {
    throw new Error('Client slug already exists')
  }

  // Check if admin email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.adminEmail }
  })

  if (existingUser) {
    throw new Error('Admin email already exists')
  }

  // Create client and admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the client
    const client = await tx.client.create({
      data: {
        name: data.clientName,
        slug: data.clientSlug,
        description: data.clientDescription,
        domain: data.clientDomain,
        settings: data.settings ? JSON.stringify(data.settings) : null,
      }
    })

    // Create the admin user
    const adminUser = await tx.user.create({
      data: {
        email: data.adminEmail,
        name: data.adminName,
        role: 'admin',
        clientId: client.id,
        emailVerified: new Date(),
        profileCompleted: true,
        onboardingCompleted: true,
      }
    })

    // Create membership for admin
    await tx.membership.create({
      data: {
        userId: adminUser.id,
        tier: 'T3',
        status: 'active',
      }
    })

    return { client, adminUser }
  })

  return result
}

export async function getOnboardingStatus(clientId: string) {
  const user = await requireUser()
  
  // Only admins can check onboarding status
  if (user.role !== 'admin') {
    throw new Error('Only admins can check onboarding status')
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profileCompleted: true,
          onboardingCompleted: true,
          createdAt: true,
        }
      }
    }
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const totalUsers = client.users.length
  const completedOnboarding = client.users.filter(u => u.onboardingCompleted).length
  const completedProfiles = client.users.filter(u => u.profileCompleted).length

  return {
    client,
    stats: {
      totalUsers,
      completedOnboarding,
      completedProfiles,
      onboardingRate: totalUsers > 0 ? Math.round((completedOnboarding / totalUsers) * 100) : 0,
      profileRate: totalUsers > 0 ? Math.round((completedProfiles / totalUsers) * 100) : 0,
    }
  }
}

export async function inviteUserToClient(clientId: string, email: string, role: string = 'member') {
  const user = await requireUser()
  
  // Only admins can invite users
  if (user.role !== 'admin') {
    throw new Error('Only admins can invite users')
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    // If user exists, assign them to the client
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: { clientId },
      include: { client: true }
    })

    return { user: updatedUser, isNewUser: false }
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      email,
      role,
      clientId,
      emailVerified: new Date(),
    }
  })

  // Create membership
  await prisma.membership.create({
    data: {
      userId: newUser.id,
      tier: 'T3', // All trial accounts get T3 access
      status: 'trial',
    }
  })

  return { user: newUser, isNewUser: true }
}

export async function getClientOnboardingData(clientId: string) {
  const user = await requireUser()
  
  // Users can only see their own client's data
  if (user.role !== 'admin' && (user as any).clientId !== clientId) {
    throw new Error('You can only view your own client\'s data')
  }

  const [
    client,
    users,
    learningProgress,
    contentEngagement
  ] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileCompleted: true,
            onboardingCompleted: true,
            createdAt: true,
            lastLoginAt: true,
          }
        }
      }
    }),
    prisma.user.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileCompleted: true,
        onboardingCompleted: true,
        createdAt: true,
        lastLoginAt: true,
      }
    }),
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

  if (!client) {
    throw new Error('Client not found')
  }

  return {
    client,
    users,
    stats: {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.lastLoginAt).length,
      completedOnboarding: users.filter(u => u.onboardingCompleted).length,
      completedProfiles: users.filter(u => u.profileCompleted).length,
      learningProgress,
      contentEngagement,
    }
  }
}
