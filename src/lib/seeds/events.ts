import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedEvents() {
  console.log('🌱 Seeding events...')

  const users = await prisma.user.findMany({
    where: { role: { in: ['admin', 'editor'] } }
  })

  if (users.length === 0) {
    console.log('No admin/editor users found. Skipping event seeding.')
    return
  }

  const host = users.find(u => u.role === 'admin') || users[0]

  // Create upcoming events
  const upcomingEvent = await prisma.event.upsert({
    where: { slug: 'bitcoin-market-outlook' },
    update: {},
    create: {
      slug: 'bitcoin-market-outlook',
      title: 'Bitcoin Market Outlook - Q4 2024',
      summary: 'Join us for an in-depth analysis of Bitcoin market trends and future outlook.',
      description: '# Bitcoin Market Outlook\n\nJoin our expert panel for a comprehensive analysis...',
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      timezone: 'UTC',
      visibility: 'member',
      locationType: 'online',
      locationText: 'Zoom Meeting',
      capacity: 50,
      hostUserId: host.id,
      resources: JSON.stringify([
        {
          title: 'Bitcoin Research Report',
          url: 'https://example.com/bitcoin-report'
        }
      ])
    }
  })

  // Create past events
  const pastEvent = await prisma.event.upsert({
    where: { slug: 'ethereum-scaling-solutions' },
    update: {},
    create: {
      slug: 'ethereum-scaling-solutions',
      title: 'Ethereum Scaling Solutions Deep Dive',
      summary: 'Comprehensive analysis of Layer 2 solutions and Eth2 improvements.',
      description: '# Ethereum Scaling Solutions\n\nOur previous session covered...',
      startAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      timezone: 'UTC',
      visibility: 'member',
      locationType: 'online',
      locationText: 'Zoom Meeting',
      capacity: 100,
      hostUserId: host.id,
      recordingUrl: 'https://www.youtube.com/watch?v=example1',
      resources: JSON.stringify([
        {
          title: 'Ethereum Scaling Research Report',
          url: 'https://drive.google.com/file/d/example1'
        }
      ])
    }
  })

  console.log(`✅ Events seeded successfully`)
}