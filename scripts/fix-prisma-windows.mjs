#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

/**
 * Fix Prisma Windows permission issues
 */
async function fixPrismaWindows() {
  console.log('🔧 Fixing Prisma Windows permission issues...')
  
  try {
    // Kill any running Node processes that might be locking files
    console.log('🔄 Stopping any running Node processes...')
    if (process.platform === 'win32') {
      await runCommand('taskkill', ['/f', '/im', 'node.exe'], { ignoreErrors: true })
    }
    
    // Clean Prisma client directory
    console.log('🧹 Cleaning Prisma client directory...')
    const prismaClientPath = join(__dirname, '..', 'node_modules', '.prisma')
    if (existsSync(prismaClientPath)) {
      try {
        await runCommand('rmdir', ['/s', '/q', prismaClientPath], { ignoreErrors: true })
      } catch (e) {
        // Ignore errors - directory might not exist or be locked
      }
    }
    
    // Wait a moment for file locks to release
    console.log('⏳ Waiting for file locks to release...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Regenerate Prisma client
    console.log('🔧 Regenerating Prisma client...')
    await runCommand('npx', ['prisma', 'generate'])
    
    console.log('✅ Prisma Windows fix completed!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message)
    console.log('\n🔄 Trying alternative approach...')
    
    try {
      // Alternative: Use npm to reinstall Prisma
      console.log('📦 Reinstalling Prisma...')
      await runCommand('npm', ['install', '@prisma/client', 'prisma'])
      await runCommand('npx', ['prisma', 'generate'])
      console.log('✅ Alternative fix completed!')
    } catch (altError) {
      console.error('❌ Alternative fix also failed:', altError.message)
      console.log('\n💡 Manual fix required:')
      console.log('1. Close all terminals and VS Code')
      console.log('2. Delete node_modules/.prisma folder')
      console.log('3. Run: npm install')
      console.log('4. Run: npx prisma generate')
      process.exit(1)
    }
  }
}

/**
 * Run command with error handling
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })
    
    child.on('close', (code) => {
      if (options.ignoreErrors || code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })
    
    child.on('error', (error) => {
      if (options.ignoreErrors) {
        resolve()
      } else {
        reject(error)
      }
    })
  })
}

fixPrismaWindows()
