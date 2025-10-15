import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedNotifications() {
  console.log('🔔 Seeding notifications...')

  const users = await prisma.user.findMany({
    where: { role: { in: ['member', 'admin'] } }
  })

  if (users.length === 0) {
    console.log('No users found. Skipping notification seeding.')
    return
  }

  const user = users[0]

  // Create sample notifications
  const notifications = [
    {
      userId: user.id,
      type: 'research_published',
      entityType: 'content',
      entityId: 'sample-content-1',
      title: 'New Research Published',
      body: 'Bitcoin Market Analysis - Q4 2024 Outlook has been published.',
      url: '/content/sample-content-1',
      channel: 'inapp'
    },
    {
      userId: user.id,
      type: 'episode_published',
      entityType: 'episode',
      entityId: 'sample-episode-1',
      title: 'New Macro Minute Episode',
      body: 'Weekly cryptocurrency market analysis is now available.',
      url: '/macro/sample-episode-1',
      channel: 'inapp'
    },
    {
      userId: user.id,
      type: 'mention',
      entityType: 'message',
      entityId: 'sample-message-1',
      title: 'You were mentioned',
      body: 'Someone mentioned you in a community discussion.',
      url: '/community?message=sample-message-1',
      channel: 'inapp'
    },
    {
      userId: user.id,
      type: 'announcement',
      title: 'Welcome to Crypto Portal',
      body: 'Thanks for joining Crypto Portal! Explore our latest research and market analysis.',
      url: '/dashboard',
      channel: 'inapp'
    }
  ]

  for (const notification of notifications) {
    await prisma.notification.create({
      data: {
        ...notification,
        readAt: Math.random() > 0.5 ? new Date() : null
      }
    })
  }

  // Create notification preferences for users
  for (const user of users) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        inApp: true,
        email: false,
        onResearch: true,
        onEpisode: true,
        onSignal: true,
        onMention: true,
        onReply: true,
        digestEnabled: false,
        digestFreq: 'weekly',
        digestHourUTC: 9
      }
    })
  }

  console.log('✅ Notifications seeded successfully')
}
