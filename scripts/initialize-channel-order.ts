/**
 * Initialize order field for existing channels
 * Run with: npx tsx scripts/initialize-channel-order.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeChannelOrder() {
  console.log('Initializing channel order field...')

  try {
    // Get all channels ordered by creation date
    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, order: true },
    })

    console.log(`Found ${channels.length} channels`)

    // Update each channel with its index as order
    for (let i = 0; i < channels.length; i++) {
      await prisma.channel.update({
        where: { id: channels[i].id },
        data: { order: i },
      })
    }

    console.log(`✅ Initialized order for ${channels.length} channels`)
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initializeChannelOrder()

