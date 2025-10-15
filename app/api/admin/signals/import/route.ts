import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Decimal } from '@/lib/num'
import { convertToSignalTrades, CSVImportRow } from '@/lib/perf/csv-import'

const ImportTradesSchema = z.object({
  trades: z.array(z.object({
    symbol: z.string().min(1),
    direction: z.enum(['LONG', 'SHORT']),
    entryTime: z.string(),
    entryPrice: z.string(),
    stopLoss: z.string().optional(),
    takeProfit: z.string().optional(),
    exitTime: z.string().optional(),
    exitPrice: z.string().optional(),
    conviction: z.number().min(1).max(5),
    riskPct: z.string(),
    tags: z.string().optional(),
    notes: z.string().optional(),
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trades } = ImportTradesSchema.parse(body)

    // Convert CSV data to SignalTrade format
    const signalTrades = convertToSignalTrades(trades as CSVImportRow[])

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdTrades = []
      
      for (const trade of signalTrades) {
        // Check for duplicates (same symbol, direction, entry time)
        const existing = await tx.signalTrade.findFirst({
          where: {
            symbol: trade.symbol,
            direction: trade.direction,
            entryTime: trade.entryTime,
          }
        })

        if (existing) {
          console.log(`Skipping duplicate trade: ${trade.symbol} ${trade.direction} ${trade.entryTime}`)
          continue
        }

        // Create the trade
        const created = await tx.signalTrade.create({
          data: {
            symbol: trade.symbol,
            slug: `${trade.symbol.toLowerCase()}-${trade.entryTime.getTime()}`,
            direction: trade.direction,
            entryTime: trade.entryTime,
            entryPrice: trade.entryPrice,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            exitTime: trade.exitTime,
            exitPrice: trade.exitPrice,
            riskPct: trade.riskPct,
            tags: trade.tags || '[]',
            notes: trade.notes,
            status: trade.status,
          }
        })

        createdTrades.push(created)
      }

      return createdTrades
    })

    // Invalidate performance cache
    await prisma.perfSnapshot.deleteMany({})

    return NextResponse.json({
      success: true,
      imported: result.length,
      skipped: signalTrades.length - result.length,
      trades: result.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        entryTime: trade.entryTime,
        status: trade.status,
      }))
    })

  } catch (error) {
    console.error('Error importing trades:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to import trades'
    }, { status: 500 })
  }
}

// Handle dry-run validation
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['editor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trades } = ImportTradesSchema.parse(body)

    // Convert and validate
    const signalTrades = convertToSignalTrades(trades as CSVImportRow[])
    
    // Check for duplicates
    const duplicates = []
    for (const trade of signalTrades) {
      const existing = await prisma.signalTrade.findFirst({
        where: {
          symbol: trade.symbol,
          direction: trade.direction,
          entryTime: trade.entryTime,
        }
      })

      if (existing) {
        duplicates.push({
          symbol: trade.symbol,
          direction: trade.direction,
          entryTime: trade.entryTime,
          existingId: existing.id
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: trades.length,
      validRows: signalTrades.length,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      summary: {
        openTrades: signalTrades.filter(t => t.status === 'open').length,
        closedTrades: signalTrades.filter(t => t.status === 'closed').length,
        longTrades: signalTrades.filter(t => t.direction === 'long').length,
        shortTrades: signalTrades.filter(t => t.direction === 'short').length,
      }
    })

  } catch (error) {
    console.error('Error validating trades:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to validate trades'
    }, { status: 500 })
  }
}
