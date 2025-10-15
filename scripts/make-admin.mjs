#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import { exit, argv } from 'node:process'

const prisma = new PrismaClient()

async function main() {
  const email = argv[2]
  
  if (!email) {
    console.error('Usage: npm run make-admin -- <email>')
    console.error('Example: npm run make-admin -- user@example.com')
    exit(1)
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      exit(1)
    }

    // Update user role to admin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' }
    })

    console.log(`✅ Successfully promoted ${updatedUser.name || updatedUser.email} to admin`)
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   Role: ${updatedUser.role}`)

  } catch (error) {
    console.error('❌ Error updating user role:', error.message)
    exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
