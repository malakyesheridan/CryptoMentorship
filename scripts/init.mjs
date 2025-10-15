#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

/**
 * Run command and wait for completion
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`)
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
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
 * Check if file exists
 */
function fileExists(path) {
  return existsSync(join(__dirname, '..', path))
}

/**
 * Main initialization
 */
async function init() {
  console.log('🚀 Initializing Crypto Portal...\n')
  
  try {
    // 1. Create .env if it doesn't exist
    if (!fileExists('.env')) {
      console.log('📝 Creating .env file...')
      if (process.platform === 'win32') {
        await runCommand('copy', ['env.example', '.env'])
      } else {
        await runCommand('cp', ['env.example', '.env'])
      }
      console.log('✅ .env file created\n')
    } else {
      console.log('✅ .env file exists\n')
    }
    
    // 2. Generate Prisma client
    console.log('🔧 Generating Prisma client...')
    await runCommand('npx', ['prisma', 'generate'])
    console.log('✅ Prisma client generated\n')
    
    // 3. Push database schema
    console.log('🗄️  Creating database schema...')
    await runCommand('npx', ['prisma', 'db', 'push'])
    console.log('✅ Database schema created\n')
    
    // 4. Seed database
    console.log('🌱 Seeding database...')
    await runCommand('npx', ['tsx', 'prisma/seed.ts'])
    console.log('✅ Database seeded\n')
    
    console.log('🎉 Initialization complete!')
    console.log('Run: npm run dev')
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message)
    process.exit(1)
  }
}

init()
