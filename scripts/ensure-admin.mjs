#!/usr/bin/env node

/**
 * Script to ensure admin user exists in production
 * This can be run as a Vercel build command or manually
 * Usage: node scripts/ensure-admin.mjs
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'coen@stewartandco.org'
const ADMIN_PASSWORD = 'Asainf00d!'
const ADMIN_NAME = 'Coen Admin'

async function ensureAdmin() {
  try {
    console.log('🔐 Ensuring admin user exists...')
    
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })
    
    if (existingUser) {
      console.log('✅ Admin user already exists!')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Role: ${existingUser.role}`)
      
      // Update to admin role if not already
      if (existingUser.role !== 'admin') {
        console.log('   Updating role to admin...')
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'admin' },
        })
        console.log('   ✅ Role updated to admin')
      }
      
      // Update password to ensure it's correct
      console.log('   Updating password...')
      const passwordHash = await hash(ADMIN_PASSWORD, 12)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          passwordHash,
          emailVerified: new Date(),
          isActive: true,
        },
      })
      console.log('   ✅ Password and status updated')
      
      return
    }
    
    // Hash password
    console.log('   Hashing password...')
    const passwordHash = await hash(ADMIN_PASSWORD, 12)
    
    // Create admin user
    console.log('   Creating admin user...')
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
    console.log('')
    console.log('✨ This admin account bypasses all subscription requirements!')
    
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error)
    // Don't exit with error code - this is a best-effort script
    // The app should still work if this fails
  } finally {
    await prisma.$disconnect()
  }
}

ensureAdmin()

