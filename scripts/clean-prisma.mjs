#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

/**
 * Clean Prisma client and regenerate
 */
async function cleanPrisma() {
  console.log('🧹 Cleaning Prisma client...')
  
  try {
    // Remove .prisma directory
    const prismaPath = join(__dirname, '..', 'node_modules', '.prisma')
    if (existsSync(prismaPath)) {
      console.log('🗑️  Removing .prisma directory...')
      if (process.platform === 'win32') {
        await runCommand('rmdir', ['/s', '/q', prismaPath])
      } else {
        await runCommand('rm', ['-rf', prismaPath])
      }
    }
    
    // Wait for file system
    console.log('⏳ Waiting for file system...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Regenerate
    console.log('🔧 Regenerating Prisma client...')
    await runCommand('npx', ['prisma', 'generate'])
    
    console.log('✅ Prisma cleaned and regenerated!')
    
  } catch (error) {
    console.error('❌ Clean failed:', error.message)
    process.exit(1)
  }
}

/**
 * Run command
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

cleanPrisma()
