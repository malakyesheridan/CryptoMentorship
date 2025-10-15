#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

const execAsync = promisify(spawn)

/**
 * Check if Prisma client is generated
 */
function checkPrismaClient() {
  const clientPath = join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js')
  return existsSync(clientPath)
}

/**
 * Check if database exists
 */
function checkDatabase() {
  const dbPath = join(__dirname, '..', 'prisma', 'dev.db')
  return existsSync(dbPath)
}

/**
 * Check if .env file exists
 */
function checkEnvFile() {
  const envPath = join(__dirname, '..', '.env')
  return existsSync(envPath)
}

/**
 * Run a command and wait for completion
 */
async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32', // Use shell on Windows
      ...options
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
    
    child.on('error', reject)
  })
}

/**
 * Main setup function
 */
async function setup() {
  console.log('🚀 Setting up Crypto Portal...\n')
  
  // Check if .env exists
  if (!checkEnvFile()) {
    console.log('📝 Creating .env file from template...')
    try {
      if (process.platform === 'win32') {
        await runCommand('copy', ['env.example', '.env'])
      } else {
        await runCommand('cp', ['env.example', '.env'])
      }
      console.log('✅ .env file created')
    } catch (error) {
      console.error('❌ Failed to create .env file:', error.message)
      process.exit(1)
    }
  } else {
    console.log('✅ .env file exists')
  }
  
  // Generate Prisma client
  console.log('🔧 Generating Prisma client...')
  try {
    await runCommand('npx', ['prisma', 'generate'])
    console.log('✅ Prisma client generated')
    
    // Verify client was generated
    if (!checkPrismaClient()) {
      throw new Error('Prisma client generation failed - client files not found')
    }
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error.message)
    process.exit(1)
  }
  
  // Push database schema
  console.log('🗄️  Setting up database schema...')
  try {
    await runCommand('npx', ['prisma', 'db', 'push'])
    console.log('✅ Database schema created')
    
    // Verify database was created
    if (!checkDatabase()) {
      throw new Error('Database creation failed - database file not found')
    }
  } catch (error) {
    console.error('❌ Failed to setup database:', error.message)
    process.exit(1)
  }
  
  // Seed database
  console.log('🌱 Seeding database...')
  try {
    await runCommand('npx', ['tsx', 'prisma/seed.ts'])
    console.log('✅ Database seeded')
  } catch (error) {
    console.error('❌ Failed to seed database:', error.message)
    process.exit(1)
  }
  
  console.log('\n🎉 Setup complete! You can now run:')
  console.log('  npm run dev')
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error.message)
  process.exit(1)
})
