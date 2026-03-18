import { NextResponse } from 'next/server'
import { getActiveStrategies } from '@/lib/strategies/queries'

// GET /api/strategies - Public: list active strategies with latest snapshots
export async function GET() {
  try {
    const strategies = await getActiveStrategies()
    return NextResponse.json(strategies)
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
