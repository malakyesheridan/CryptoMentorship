#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests the connection to Neon PostgreSQL
 */

import { PrismaClient } from '@prisma/client'

async function testConnection() {
  console.log('🔍 Testing Neon PostgreSQL connection...')
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Connected to Neon PostgreSQL successfully!')

    // Test a simple query
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('📊 Database version:', result)

    // Test table creation (this will create tables if they don't exist)
    console.log('🏗️  Testing table creation...')
    
    // Try to create a test user (this will fail if tables don't exist)
    try {
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'member'
        }
      })
      console.log('✅ Test user created successfully:', testUser.id)
      
      // Clean up test user
      await prisma.user.delete({
        where: { id: testUser.id }
      })
      console.log('🧹 Test user cleaned up')
      
    } catch (error) {
      console.log('⚠️  Tables not yet created. Run migration first.')
      console.log('   Run: npm run db:migrate:prod')
    }

    console.log('')
    console.log('🎉 Database connection test completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Run: npm run db:migrate:prod')
    console.log('2. Run: npm run db:seed')
    console.log('3. Test your app locally')

  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('')
    console.log('Troubleshooting:')
    console.log('1. Check your DATABASE_URL in .env.local')
    console.log('2. Verify your Neon database is active')
    console.log('3. Check your internet connection')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
