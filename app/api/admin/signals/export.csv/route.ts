import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/signals/export.csv - Export signals as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const symbol = searchParams.get('symbol')
    const tags = searchParams.get('tags')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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
    
    if (startDate || endDate) {
      where.entryTime = {}
      if (startDate) {
        where.entryTime.gte = new Date(startDate)
      }
      if (endDate) {
        where.entryTime.lte = new Date(endDate)
      }
    }

    // Get all signals for export
    const signals = await prisma.signalTrade.findMany({
      where,
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { entryTime: 'desc' }
    })

    // Generate CSV content
    const csvHeaders = [
      'Symbol',
      'Market',
      'Direction',
      'Entry Time',
      'Entry Price',
      'Stop Loss',
      'Take Profit',
      'Conviction',
      'Risk %',
      'Status',
      'Exit Time',
      'Exit Price',
      'Notes',
      'Tags',
      'Created By',
      'Created At',
      'Updated At'
    ]

    const csvRows = signals.map(signal => [
      signal.symbol,
      signal.market,
      signal.direction,
      signal.entryTime.toISOString(),
      signal.entryPrice.toString(),
      signal.stopLoss?.toString() || '',
      signal.takeProfit?.toString() || '',
      signal.conviction?.toString() || '',
      signal.riskPct?.toString() || '',
      signal.status,
      signal.exitTime?.toISOString() || '',
      signal.exitPrice?.toString() || '',
      signal.notes ? `"${signal.notes.replace(/"/g, '""')}"` : '',
      signal.tags || '',
      signal.createdBy?.name || '',
      signal.createdAt.toISOString(),
      signal.updatedAt.toISOString()
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    // Set response headers for CSV download
    const filename = `signals-export-${new Date().toISOString().split('T')[0]}.csv`
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error exporting signals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
