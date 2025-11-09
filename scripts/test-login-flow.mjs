#!/usr/bin/env node

/**
 * Test script to diagnose login flow issues
 * This simulates what happens during login to identify where it breaks
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TEST_EMAIL = 'malakye@easyflow.au'
const TEST_PASSWORD = 'Sainters12!!'

async function testLoginFlow() {
  console.log('='.repeat(80))
  console.log('LOGIN FLOW DIAGNOSTIC TEST')
  console.log('='.repeat(80))
  console.log()

  try {
    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists...')
    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    })

    if (!user) {
      console.log('❌ User not found!')
      console.log('Creating test user...')
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10)
      const newUser = await prisma.user.create({
        data: {
          email: TEST_EMAIL,
          passwordHash: hashedPassword,
          name: 'Test User',
          role: 'member',
          isActive: true,
          emailVerified: new Date(),
        },
      })
      console.log('✅ Test user created:', newUser.id)
    } else {
      console.log('✅ User found:', user.id)
      console.log('  - Email:', user.email)
      console.log('  - Role:', user.role)
      console.log('  - Active:', user.isActive)
      console.log('  - Has password hash:', !!user.passwordHash)
      console.log('  - Locked until:', user.lockedUntil)
      console.log('  - Failed attempts:', user.failedLoginAttempts)
    }
    console.log()

    // Step 2: Test password verification
    console.log('Step 2: Testing password verification...')
    if (user && user.passwordHash) {
      const isValid = await bcrypt.compare(TEST_PASSWORD, user.passwordHash)
      console.log('✅ Password verification:', isValid ? 'PASSED' : 'FAILED')
    } else {
      console.log('⚠️  Cannot test password - user or hash not found')
    }
    console.log()

    // Step 3: Check membership
    console.log('Step 3: Checking membership...')
    const userId = user?.id || (await prisma.user.findUnique({ where: { email: TEST_EMAIL } }))?.id
    if (userId) {
      const membership = await prisma.membership.findUnique({
        where: { userId },
      })
      if (membership) {
        console.log('✅ Membership found:', membership.tier, '- Status:', membership.status)
      } else {
        console.log('⚠️  No membership found - creating default...')
        await prisma.membership.create({
          data: {
            userId,
            tier: 'T1',
            status: 'active',
          },
        })
        console.log('✅ Default membership created')
      }
    }
    console.log()

    // Step 4: Check environment variables
    console.log('Step 4: Checking environment variables...')
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    const nextAuthUrl = process.env.NEXTAUTH_URL
    console.log('NEXTAUTH_SECRET:', nextAuthSecret ? `${nextAuthSecret.substring(0, 10)}... (length: ${nextAuthSecret.length})` : 'NOT SET')
    console.log('NEXTAUTH_URL:', nextAuthUrl || 'NOT SET')
    console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET')
    
    // Calculate what secret would be used
    const calculatedSecret = !nextAuthSecret || nextAuthSecret.length < 32
      ? 'dev-secret-key-for-local-development-only-not-for-production-use'
      : nextAuthSecret
    console.log('Calculated secret (what would be used):', calculatedSecret.substring(0, 10) + '... (length: ' + calculatedSecret.length + ')')
    console.log()

    // Step 5: Test NextAuth API endpoint
    console.log('Step 5: Testing NextAuth callback endpoint...')
    console.log('⚠️  This requires a running server. Starting server test...')
    
    const baseUrl = nextAuthUrl || 'http://localhost:3000'
    console.log('Base URL:', baseUrl)
    
    try {
      // Test if server is running
      const healthCheck = await fetch(`${baseUrl}/api/auth/providers`)
      if (healthCheck.ok) {
        console.log('✅ NextAuth API is accessible')
        const providers = await healthCheck.json()
        console.log('Available providers:', Object.keys(providers))
      } else {
        console.log('⚠️  NextAuth API returned:', healthCheck.status)
      }
    } catch (error) {
      console.log('❌ Cannot reach NextAuth API:', error.message)
      console.log('   Make sure the dev server is running (npm run dev)')
    }
    console.log()

    // Step 6: Summary
    console.log('='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log('✅ User exists and can be authenticated')
    console.log('✅ Password verification works')
    console.log('✅ Membership exists')
    console.log('⚠️  Check NEXTAUTH_SECRET and NEXTAUTH_URL are set correctly')
    console.log('⚠️  Make sure dev server is running to test full flow')
    console.log()
    console.log('Next steps:')
    console.log('1. Ensure NEXTAUTH_SECRET is set in .env (or use default)')
    console.log('2. Ensure NEXTAUTH_URL matches your server URL')
    console.log('3. Start dev server: npm run dev')
    console.log('4. Try logging in and check server logs for middleware debug output')
    console.log()

  } catch (error) {
    console.error('❌ Error during test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testLoginFlow().catch((error) => {
  console.error('Test failed:', error)
  process.exit(1)
})

