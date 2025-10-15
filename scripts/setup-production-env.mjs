#!/usr/bin/env node

/**
 * Production Environment Setup Script
 * Sets up all necessary environment variables for production deployment
 */

import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const productionEnvContent = `# Production Environment Variables
# Copy these to your Vercel environment variables

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# NextAuth Configuration (REQUIRED)
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secure-secret-key-here"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Provider (Optional)
EMAIL_SERVER=""
EMAIL_FROM=""

# Public Environment Variables
NEXT_PUBLIC_GOOGLE_ENABLED="false"
NEXT_PUBLIC_EMAIL_ENABLED="false"

# Security
NODE_ENV="production"
`

const developmentEnvContent = `# Development Environment Variables
# Copy these to your .env.local file

# Database (Neon PostgreSQL for production testing)
DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Development Database (SQLite - for local development)
DATABASE_URL_DEV="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:5001"
NEXTAUTH_SECRET="dev-secret-key-for-local-development-only"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Provider (Optional)
EMAIL_SERVER=""
EMAIL_FROM=""

# Public Environment Variables
NEXT_PUBLIC_GOOGLE_ENABLED="false"
NEXT_PUBLIC_EMAIL_ENABLED="false"

# Development
NODE_ENV="development"
`

console.log('🚀 Setting up production environment configuration...')
console.log('')

// Create production environment file
writeFileSync(join(process.cwd(), '.env.production'), productionEnvContent)
console.log('✅ Created .env.production with production settings')

// Create development environment file
writeFileSync(join(process.cwd(), '.env.development'), developmentEnvContent)
console.log('✅ Created .env.development with development settings')

console.log('')
console.log('📋 Next Steps:')
console.log('')
console.log('1. Copy the connection strings to your .env.local file:')
console.log('   DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"')
console.log('   DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"')
console.log('')
console.log('2. Generate a secure NEXTAUTH_SECRET:')
console.log('   npm run generate-secret')
console.log('')
console.log('3. Test the connection:')
console.log('   npm run test:neon')
console.log('')
console.log('4. Deploy to Vercel:')
console.log('   - Add environment variables to Vercel dashboard')
console.log('   - Push to GitHub (auto-deploy)')
console.log('')
console.log('🎉 Your app is now ready for production deployment!')
