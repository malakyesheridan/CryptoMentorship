#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('📦 Exporting portal data...')

    // Create backups directory
    const backupsDir = join(process.cwd(), 'backups')
    await mkdir(backupsDir, { recursive: true })

    // Export all data
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users: await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          }
        }),
        content: await prisma.content.findMany(),
        episodes: await prisma.episode.findMany(),
        channels: await prisma.channel.findMany(),
        messages: await prisma.message.findMany({
          where: { deletedAt: null }
        }),
        memberships: await prisma.membership.findMany(),
      }
    }

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
    const filename = `portal-${timestamp}.json`
    const filepath = join(backupsDir, filename)

    // Write file
    await writeFile(filepath, JSON.stringify(data, null, 2))

    console.log(`✅ Data exported successfully to: ${filepath}`)
    console.log(`📊 Exported:`)
    console.log(`   - ${data.data.users.length} users`)
    console.log(`   - ${data.data.content.length} content items`)
    console.log(`   - ${data.data.episodes.length} episodes`)
    console.log(`   - ${data.data.channels.length} channels`)
    console.log(`   - ${data.data.messages.length} messages`)
    console.log(`   - ${data.data.memberships.length} memberships`)

  } catch (error) {
    console.error('❌ Export failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
