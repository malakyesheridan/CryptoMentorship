#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

/**
 * Check if Prisma client exists
 */
function checkPrismaClient() {
  const clientPath = join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js')
  return existsSync(clientPath)
}

/**
 * Generate Prisma client with error handling
 */
async function generatePrismaClient() {
  if (checkPrismaClient()) {
    console.log('✅ Prisma client already exists')
    return
  }
  
  console.log('🔧 Generating Prisma client...')
  
  try {
    await runCommand('npx', ['prisma', 'generate'])
    console.log('✅ Prisma client generated')
  } catch (error) {
    console.error('❌ Prisma generation failed:', error.message)
    console.error('')
    console.error('💡 Run this to fix:')
    console.error('  npm run clean:prisma')
    console.error('  npm run dev')
    process.exit(1)
  }
}

/**
 * Check if Next.js is installed locally
 */
function checkNextInstallation() {
  const nextPath = join(__dirname, '..', 'node_modules', 'next', 'package.json')
  
  if (!existsSync(nextPath)) {
    console.error('❌ Next.js is not installed.')
    console.error('')
    console.error('Run this command to install dependencies:')
    console.error('  npm install')
    console.error('')
    console.error('Then run:')
    console.error('  npm run dev')
    process.exit(1)
  }
  
  console.log('✅ Next.js is installed locally')
}

/**
 * Run command with error handling
 */
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
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
 * Main preflight check
 */
async function main() {
  try {
    console.log('🚀 Running preflight checks...\n')
    
    // 1. Check Next.js installation
    checkNextInstallation()
    
    // 2. Generate Prisma client if needed
    await generatePrismaClient()
    
    console.log('\n✅ All preflight checks passed!')
    
  } catch (error) {
    console.error('❌ Preflight check failed:', error.message)
    process.exit(1)
  }
}

main()
