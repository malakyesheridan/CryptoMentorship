import assert from 'node:assert/strict'
import { deriveAllocations } from '../src/lib/portfolio/deriveAllocations'

function run() {
  const aggressive = deriveAllocations('AGGRESSIVE', { primary: 'btc' })
  assert.deepEqual(aggressive, [{ symbol: 'BTC', weight: 1.0 }])

  const semi = deriveAllocations('SEMI', { primary: 'ETH', secondary: 'SOL' })
  assert.deepEqual(semi, [
    { symbol: 'ETH', weight: 0.8 },
    { symbol: 'SOL', weight: 0.2 },
  ])

  const conservative = deriveAllocations('CONSERVATIVE', {
    primary: 'BTC',
    secondary: 'ETH',
    tertiary: 'SOL',
  })
  assert.deepEqual(conservative, [
    { symbol: 'BTC', weight: 0.6 },
    { symbol: 'ETH', weight: 0.3 },
    { symbol: 'SOL', weight: 0.1 },
  ])

  assert.throws(() => deriveAllocations('SEMI', { primary: 'BTC' }))
  assert.throws(() => deriveAllocations('CONSERVATIVE', { primary: 'BTC', secondary: 'ETH' }))
}

run()
console.log('deriveAllocations tests passed')
