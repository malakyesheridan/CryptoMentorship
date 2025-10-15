#!/usr/bin/env node

/**
 * Database Configuration Script
 * Sets up environment variables for Neon PostgreSQL production database
 */

import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const envContent = `# Production Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Development Database (SQLite - for local development)
DATABASE_URL_DEV="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:5001"
NEXTAUTH_SECRET="your_generated_secret_here"

# Google OAuth (optional - enables Google sign-in)
# Get these from https://console.developers.google.com/
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Magic Link (optional - enables email sign-in)
# Example using Mailtrap for development:
EMAIL_SERVER="smtp://username:password@smtp.mailtrap.io:2525"
EMAIL_FROM="Crypto Portal <no-reply@example.com>"

# Public environment variables (for client-side provider detection)
NEXT_PUBLIC_GOOGLE_ENABLED="false"
NEXT_PUBLIC_EMAIL_ENABLED="false"

# Port fallback preferences (comma-separated)
PORT_PREFERRED="5000,5001,3000"

# Optional: Supabase (if you want real-time chat)
# SUPABASE_URL=""
# SUPABASE_ANON_KEY=""
`

const envPath = join(process.cwd(), '.env.local')

if (!existsSync(envPath)) {
  writeFileSync(envPath, envContent)
  console.log('✅ Created .env.local with Neon PostgreSQL configuration')
} else {
  console.log('⚠️  .env.local already exists. Please manually update it with the Neon connection string.')
  console.log('Add these lines to your .env.local:')
  console.log('')
  console.log('DATABASE_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"')
  console.log('DIRECT_URL="postgresql://neondb_owner:npg_grz4csh0AWRl@ep-green-dawn-a7cqi4ee.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"')
}

console.log('')
console.log('🚀 Next steps:')
console.log('1. Copy the connection strings above to your .env.local file')
console.log('2. Run: npm run db:setup:prod')
console.log('3. Test the connection: npm run db:test:prod')
