#!/usr/bin/env node

import { spawn } from 'node:child_process'

/**
 * Test Prisma schema validation
 */
async function testPrisma() {
  console.log('🧪 Testing Prisma schema...')
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      shell: true
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Prisma schema is valid!')
        resolve()
      } else {
        console.log('❌ Prisma schema has errors')
        reject(new Error(`Prisma validation failed with exit code ${code}`))
      }
    })
    
    child.on('error', reject)
  })
}

testPrisma().catch(error => {
  console.error('Test failed:', error.message)
  process.exit(1)
})
