/**
 * Migration script to update all T3 trials to T2 (Elite)
 * Run with: npx tsx scripts/migrate-t3-to-t2.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateT3ToT2() {
  console.log('Starting migration: T3 → T2 (Elite)...')

  try {
    // Update all memberships with T3 tier to T2
    const result = await prisma.membership.updateMany({
      where: {
        tier: 'T3',
      },
      data: {
        tier: 'T2',
      },
    })

    console.log(`✅ Updated ${result.count} memberships from T3 to T2`)

    // Update all portfolio daily signals with T3 tier to T2
    const signalsResult = await prisma.portfolioDailySignal.updateMany({
      where: {
        tier: 'T3',
      },
      data: {
        tier: 'T2',
      },
    })

    console.log(`✅ Updated ${signalsResult.count} portfolio daily signals from T3 to T2`)

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateT3ToT2()

