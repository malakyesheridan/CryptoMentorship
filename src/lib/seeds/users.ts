import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedUsers() {
  console.log('👥 Seeding users...')

  // Create demo users
  const users = [
    {
      name: 'Demo Admin',
      email: 'admin@demo.com',
      role: 'admin',
      emailVerified: new Date()
    },
    {
      name: 'Demo Editor',
      email: 'editor@demo.com',
      role: 'editor',
      emailVerified: new Date()
    },
    {
      name: 'Demo Member',
      email: 'member@demo.com',
      role: 'member',
      emailVerified: new Date()
    },
    {
      name: 'John Smith',
      email: 'john@example.com',
      role: 'member',
      emailVerified: new Date()
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'member',
      emailVerified: new Date()
    },
    {
      name: 'Mike Chen',
      email: 'mike@example.com',
      role: 'member',
      emailVerified: new Date()
    }
  ]

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData
    })
  }

  console.log('✅ Users seeded successfully')
}
