import { PrismaClient } from '@prisma/client'
import { seedUsers } from './seeds/users'
import { seedEvents } from './seeds/events'
import { seedNotifications } from './seeds/notifications'
import { seedContent } from './seeds/content'
import { seedSignalTrades } from './seeds/signals'
import { seedLearningTracks } from './seeds/learning'
import { seedCohorts } from './seeds/cohorts'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Seed users first (required for other seeds)
    await seedUsers()

    // Seed content
    await seedContent()

    // Seed notifications
    await seedNotifications()

    // Seed events (requires users)
    await seedEvents()

    // Seed signal trades
    await seedSignalTrades()

    // Seed learning tracks
    await seedLearningTracks()

    // Seed cohorts (requires learning tracks)
    await seedCohorts()

    console.log('✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
