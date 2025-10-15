import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/signals - Get signals for members (respects minTier)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const symbol = searchParams.get('symbol')
    const tags = searchParams.get('tags')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (symbol) {
      where.symbol = { contains: symbol, mode: 'insensitive' }
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim())
      where.tags = { hasSome: tagArray }
    }

    // Get signals
    const signals = await prisma.signalTrade.findMany({
      where,
      select: {
        id: true,
        slug: true,
        symbol: true,
        market: true,
        direction: true,
        thesis: true,
        tags: true,
        entryTime: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit: true,
        conviction: true,
        riskPct: true,
        status: true,
        exitTime: true,
        exitPrice: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { entryTime: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = signals.length > limit
    const items = hasNextPage ? signals.slice(0, -1) : signals
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

    return NextResponse.json({
      signals: items,
      pagination: {
        hasNextPage,
        nextCursor,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching signals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
