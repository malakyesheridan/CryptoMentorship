#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

/**
 * Fix port configuration in .env file
 */
function fixEnvPort() {
  const envPath = join(__dirname, '..', '.env')
  
  if (!existsSync(envPath)) {
    console.log('❌ .env file not found. Run "npm run init" first.')
    return
  }
  
  try {
    let envContent = readFileSync(envPath, 'utf8')
    
    // Update NEXTAUTH_URL to use dynamic port
    envContent = envContent.replace(
      /NEXTAUTH_URL="http:\/\/localhost:\d+"/,
      'NEXTAUTH_URL="http://localhost:5001"'
    )
    
    writeFileSync(envPath, envContent)
    console.log('✅ Updated .env with correct port configuration')
  } catch (error) {
    console.error('❌ Failed to update .env:', error.message)
  }
}

fixEnvPort()
