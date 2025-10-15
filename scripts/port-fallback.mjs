#!/usr/bin/env node

import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Check if a port is available by attempting to bind to it
 */
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.listen(port, () => {
      server.close(() => resolve(true))
    })
    
    server.on('error', () => resolve(false))
  })
}

/**
 * Find the first available port from the list
 */
async function pickPort(ports) {
  for (const port of ports) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  return null
}

/**
 * Get process info for a port (best effort, may not work on all systems)
 */
async function getPortProcessInfo(port) {
  try {
    if (process.platform === 'win32') {
      // Windows: use netstat
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`)
      const lines = stdout.trim().split('\n').filter(line => line.includes(`:${port}`))
      if (lines.length > 0) {
        const pid = lines[0].split(/\s+/).pop()
        return pid ? `PID ${pid}` : 'Unknown process'
      }
    } else {
      // Unix-like: use lsof
      const { stdout } = await execAsync(`lsof -ti:${port}`)
      const pids = stdout.trim().split('\n').filter(Boolean)
      if (pids.length > 0) {
        return `PID ${pids[0]}`
      }
    }
  } catch (error) {
    // Ignore errors - this is best effort only
  }
  return 'Unknown process'
}

/**
 * Main function
 */
async function main() {
  const [,, mode, ...args] = process.argv
  
  // Validate mode
  if (!['dev', 'start'].includes(mode)) {
    console.error('Error: mode must be "dev" or "start"')
    process.exit(1)
  }
  
  // Determine ports to try
  let ports
  if (args.length > 0) {
    ports = args.map(p => parseInt(p, 10)).filter(p => !isNaN(p))
  } else if (process.env.PORT_PREFERRED) {
    ports = process.env.PORT_PREFERRED.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p))
  } else {
    ports = [5000, 5001, 3000]
  }
  
  if (ports.length === 0) {
    console.error('Error: no valid ports specified')
    process.exit(1)
  }
  
  // Find available port
  const port = await pickPort(ports)
  
  if (!port) {
    console.error('Error: All ports are busy:')
    for (const p of ports) {
      const processInfo = await getPortProcessInfo(p)
      console.error(`  Port ${p}: ${processInfo}`)
    }
    process.exit(1)
  }
  
  // Print port usage info
  const portList = ports.join(' → ')
  console.log(`Using port ${port} (fallback order: ${portList})`)
  
  // Spawn Next.js process using Node.js directly
  const nextCliPath = 'node_modules/next/dist/bin/next'
  
  // Verify Next.js CLI exists
  const fs = await import('node:fs')
  if (!fs.existsSync(nextCliPath)) {
    console.error('❌ Next.js CLI not found at:', nextCliPath)
    console.error('Please run: npm install')
    process.exit(1)
  }
  
  const nextProcess = spawn('node', [nextCliPath, mode, '-p', port.toString()], {
    stdio: 'inherit',
    shell: false
  })
  
  // Forward signals to child process
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT']
  signals.forEach(signal => {
    process.on(signal, () => {
      nextProcess.kill(signal)
    })
  })
  
  // Handle child process exit
  nextProcess.on('close', (code) => {
    process.exit(code ?? 0)
  })
  
  nextProcess.on('error', (error) => {
    console.error('Error starting Next.js:', error.message)
    process.exit(1)
  })
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error.message)
  process.exit(1)
})
