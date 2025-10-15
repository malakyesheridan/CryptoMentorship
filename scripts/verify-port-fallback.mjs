#!/usr/bin/env node

import { createServer } from 'node:net'

/**
 * Test port availability for the fallback system
 */
async function testPortFallback() {
  console.log('🔍 Testing port fallback system...\n')
  
  const ports = [5000, 5001, 3000]
  const results = []
  
  for (const port of ports) {
    const available = await isPortAvailable(port)
    const status = available ? '✅ Available' : '❌ Busy'
    results.push({ port, available })
    console.log(`Port ${port}: ${status}`)
  }
  
  const availablePorts = results.filter(r => r.available).map(r => r.port)
  const busyPorts = results.filter(r => !r.available).map(r => r.port)
  
  console.log('\n📊 Summary:')
  if (availablePorts.length > 0) {
    console.log(`✅ Available ports: ${availablePorts.join(', ')}`)
  }
  if (busyPorts.length > 0) {
    console.log(`❌ Busy ports: ${busyPorts.join(', ')}`)
  }
  
  console.log(`\n🎯 Fallback order: ${ports.join(' → ')}`)
  
  if (availablePorts.length === 0) {
    console.log('\n⚠️  All ports are busy!')
    process.exit(1)
  } else {
    console.log(`\n✅ System will use port ${availablePorts[0]} (first available)`)
  }
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.listen(port, () => {
      server.close(() => resolve(true))
    })
    
    server.on('error', () => resolve(false))
  })
}

// Run the test
testPortFallback().catch(console.error)