#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { exit, argv } from 'node:process'

const prisma = new PrismaClient()

async function main() {
  const filePath = argv[2]
  const isDryRun = argv.includes('--dry')
  
  if (!filePath) {
    console.error('Usage: npm run import:data -- <file.json> [--dry]')
    console.error('Example: npm run import:data -- ./backups/portal-20240115-143022.json')
    console.error('Dry run: npm run import:data -- ./backups/portal-20240115-143022.json --dry')
    exit(1)
  }

  try {
    console.log(`📥 ${isDryRun ? 'Dry run: ' : ''}Importing portal data from: ${filePath}`)

    // Read and parse file
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)

    if (!data.data) {
      throw new Error('Invalid data format')
    }

    console.log(`📊 Found data:`)
    console.log(`   - ${data.data.users?.length || 0} users`)
    console.log(`   - ${data.data.content?.length || 0} content items`)
    console.log(`   - ${data.data.episodes?.length || 0} episodes`)
    console.log(`   - ${data.data.channels?.length || 0} channels`)
    console.log(`   - ${data.data.messages?.length || 0} messages`)
    console.log(`   - ${data.data.memberships?.length || 0} memberships`)

    if (isDryRun) {
      console.log('✅ Dry run completed - no data was imported')
      return
    }

    // Import data
    if (data.data.users?.length > 0) {
      console.log('👥 Importing users...')
      for (const user of data.data.users) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            role: user.role,
          },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          }
        })
      }
    }

    if (data.data.content?.length > 0) {
      console.log('📄 Importing content...')
      for (const content of data.data.content) {
        await prisma.content.upsert({
          where: { slug: content.slug },
          update: content,
          create: content
        })
      }
    }

    if (data.data.episodes?.length > 0) {
      console.log('🎬 Importing episodes...')
      for (const episode of data.data.episodes) {
        await prisma.episode.upsert({
          where: { slug: episode.slug },
          update: episode,
          create: episode
        })
      }
    }

    if (data.data.channels?.length > 0) {
      console.log('💬 Importing channels...')
      for (const channel of data.data.channels) {
        await prisma.channel.upsert({
          where: { slug: channel.slug },
          update: channel,
          create: channel
        })
      }
    }

    if (data.data.messages?.length > 0) {
      console.log('💭 Importing messages...')
      for (const message of data.data.messages) {
        await prisma.message.upsert({
          where: { id: message.id },
          update: message,
          create: message
        })
      }
    }

    if (data.data.memberships?.length > 0) {
      console.log('🎫 Importing memberships...')
      for (const membership of data.data.memberships) {
        await prisma.membership.upsert({
          where: { userId: membership.userId },
          update: membership,
          create: membership
        })
      }
    }

    console.log('✅ Data imported successfully!')

  } catch (error) {
    console.error('❌ Import failed:', error.message)
    exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
