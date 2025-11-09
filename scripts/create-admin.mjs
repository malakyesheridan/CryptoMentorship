#!/usr/bin/env node

/**
 * Script to create an admin user that bypasses subscription requirements
 * Usage: node scripts/create-admin.mjs
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'coen@stewartandco.org'
const ADMIN_PASSWORD = 'Asainf00d!'
const ADMIN_NAME = 'Coen Admin'

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...')
    
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })
    
    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: ${existingUser.role}`)
      console.log(`   ID: ${existingUser.id}`)
      
      // Update to admin role if not already
      if (existingUser.role !== 'admin') {
        console.log('   Updating role to admin...')
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'admin' },
        })
        console.log('   ✅ Role updated to admin')
      }
      
      // Update password
      console.log('   Updating password...')
      const passwordHash = await hash(ADMIN_PASSWORD, 12)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      })
      console.log('   ✅ Password updated')
      
      return
    }
    
    // Hash password
    console.log('   Hashing password...')
    const passwordHash = await hash(ADMIN_PASSWORD, 12)
    
    // Create admin user
    console.log('   Creating user...')
    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: 'admin',
        emailVerified: new Date(),
        isActive: true,
      },
    })
    
    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${adminUser.email}`)
    console.log(`   Name: ${adminUser.name}`)
    console.log(`   Role: ${adminUser.role}`)
    console.log(`   ID: ${adminUser.id}`)
    console.log('')
    console.log('🔑 Login credentials:')
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('')
    console.log('✨ This admin account bypasses all subscription requirements!')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

