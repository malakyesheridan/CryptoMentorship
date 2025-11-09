#!/usr/bin/env node

/**
 * Script to fix database schema by adding missing columns
 * This is a one-time fix for production databases that are missing columns
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSchema() {
  try {
    console.log('🔧 Fixing database schema...')
    
    // Check if columns exist by trying to query them
    try {
      await prisma.$queryRaw`
        SELECT "lockedUntil", "failedLoginAttempts" FROM "User" LIMIT 1
      `
      console.log('✅ Columns already exist')
      return
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('column')) {
        console.log('⚠️  Missing columns detected, adding them...')
      } else {
        throw error
      }
    }
    
    // Add missing columns
    console.log('   Adding lockedUntil column...')
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3)
    `
    
    console.log('   Adding failedLoginAttempts column...')
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0
    `
    
    console.log('✅ Schema fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error)
    // Don't exit with error - try to continue
  } finally {
    await prisma.$disconnect()
  }
}

fixSchema()

