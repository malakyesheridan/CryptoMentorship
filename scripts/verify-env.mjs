#!/usr/bin/env node

/**
 * Environment verification script for deployment readiness
 */

console.log('🔍 Verifying deployment environment...\n')

// Check database configuration
const databaseUrl = process.env.DATABASE_URL
if (databaseUrl) {
  if (databaseUrl.startsWith('postgresql://')) {
    console.log('✅ Database: Using PostgreSQL (production)')
  } else if (databaseUrl.startsWith('file:')) {
    console.log('✅ Database: Using SQLite (development)')
  } else {
    console.log('⚠️  Database: Unknown connection string format')
  }
} else {
  console.log('✅ Database: Using default SQLite (development)')
}

// Check NextAuth configuration
const nextAuthSecret = process.env.NEXTAUTH_SECRET
if (!nextAuthSecret) {
  console.log('❌ NEXTAUTH_SECRET is missing - required for production')
} else if (nextAuthSecret === 'change-me') {
  console.log('⚠️  NEXTAUTH_SECRET is still set to default value')
} else {
  console.log('✅ NEXTAUTH_SECRET is configured')
}

const nextAuthUrl = process.env.NEXTAUTH_URL
if (!nextAuthUrl) {
  console.log('❌ NEXTAUTH_URL is missing - required for production')
} else {
  console.log('✅ NEXTAUTH_URL is configured')
}

// Check demo auth setting
const demoAuth = process.env.NEXT_PUBLIC_DEMO_AUTH
if (demoAuth === 'true') {
  console.log('⚠️  NEXT_PUBLIC_DEMO_AUTH is enabled - should be false in production')
} else if (demoAuth === 'false') {
  console.log('✅ NEXT_PUBLIC_DEMO_AUTH is disabled (production ready)')
} else {
  console.log('ℹ️  NEXT_PUBLIC_DEMO_AUTH not set (defaults to false)')
}

// Check cron configuration
const cronSecret = process.env.VERCEL_CRON_SECRET
if (cronSecret) {
  console.log('✅ VERCEL_CRON_SECRET is configured')
  console.log('ℹ️  Cron URL: /api/cron/publish?secret=' + cronSecret)
} else {
  console.log('ℹ️  VERCEL_CRON_SECRET not set (cron endpoint unprotected)')
}

// Check storage configuration
const hasAwsConfig = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
if (hasAwsConfig) {
  console.log('✅ AWS storage credentials configured')
} else {
  console.log('ℹ️  AWS storage not configured (using local fallback)')
}

console.log('\n🎯 Deployment readiness check complete!')
