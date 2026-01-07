import { PrismaClient } from '@prisma/client'
import { seedUsers } from '../src/lib/seeds/users'
import { seedEvents } from '../src/lib/seeds/events'
import { seedNotifications } from '../src/lib/seeds/notifications'
import { seedContent } from '../src/lib/seeds/content'
import { seedQAData } from '../src/lib/seeds/qa'
import { seedSignals } from './seeds/signals'
import { seedCommunity } from '../src/lib/seeds/community'
import { seedLearningTracks } from '../src/lib/seeds/learning'
import { seedCohorts } from '../src/lib/seeds/cohorts'
import { seedRoiDashboard } from '../src/lib/seeds/roi-dashboard'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Seed users first (required for other seeds)
    await seedUsers()

    // Seed content
    await seedContent()

    // Seed learning tracks (no dependencies)
    await seedLearningTracks()

    // Seed notifications
    await seedNotifications()

    // Seed events (requires users)
    await seedEvents()

    // Seed Q&A data (requires events)
    await seedQAData()

    // Seed signals (requires users)
    await seedSignals()

    // Seed ROI dashboard data
    await seedRoiDashboard()

    // Seed community demo messages
    await seedCommunity()

    // Seed cohorts (requires users and learning tracks)
    await seedCohorts()

    console.log('✅ Database seeding completed successfully!')
    console.log('\n📋 Created demo data:')
    console.log('- 6 demo users (admin, editor, members)')
    console.log('- 4 research articles and resources')
    console.log('- 2 comprehensive learning tracks with lessons and quizzes')
    console.log('- 1 structured learning cohort with weekly releases')
    console.log('- Sample notifications')
    console.log('- 6 events (3 upcoming, 2 past with recordings, 1 admin-only)')
    console.log('- Q&A data with questions, chapters, and transcript')
    console.log('- 15+ RSVPs with realistic data')
    console.log('- 8 signal trades (6 closed, 2 open)')
    console.log('- Portfolio settings for performance calculations')
    console.log('- ROI dashboard settings, series, allocation, and change log')
    console.log('- Community channels and demo messages')
    console.log('\n🚀 Login credentials:')
    console.log('- Admin: admin@demo.com')
    console.log('- Member: member@demo.com')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
