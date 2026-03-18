import { NextRequest, NextResponse } from 'next/server'
import { getStrategyBySlug, getEquityCurve } from '@/lib/strategies/queries'

// GET /api/strategies/[slug]/equity - Public: equity curve data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const strategy = await getStrategyBySlug(slug)

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const equityCurve = await getEquityCurve(strategy.id)
    return NextResponse.json(equityCurve)
  } catch (error) {
    console.error('Error fetching equity curve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
