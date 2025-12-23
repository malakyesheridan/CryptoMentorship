import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const createDailySignalSchema = z.object({
  tier: z.enum(['T1', 'T2']),
  category: z.enum(['majors', 'memecoins']).optional(),
  signal: z.string().min(1).max(500),
  executiveSummary: z.string().optional(),
  associatedData: z.string().optional(),
}).refine((data) => {
  // Category is required for T2 (Elite), optional for T1 (Growth)
  if (data.tier === 'T2') {
    return data.category === 'majors' || data.category === 'memecoins'
  }
  return true
}, {
  message: "Category must be 'majors' or 'memecoins' for T2 (Elite) tier",
  path: ['category']
})

// GET /api/admin/portfolio-daily-signals - Get all daily updates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (tier) {
      where.tier = tier
    }

    const signals = await prisma.portfolioDailySignal.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ signals })
  } catch (error) {
    console.error('Error fetching daily updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/portfolio-daily-signals - Create new daily update (replaces existing for today)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createDailySignalSchema.parse(body)

    // Delete any existing update for this tier/category for today only (keep history)
    let whereClause: any
    const now = new Date()
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
    const todayFilter = {
      gte: startOfTodayUtc,
      lt: new Date(endOfTodayUtc.getTime() + 1)
    }
    
    if (data.tier === 'T2' && data.category) {
      // For T2 (Elite), filter by tier and category
      whereClause = {
        tier: data.tier,
        category: data.category,
        publishedAt: todayFilter
      }
    } else if (data.tier === 'T1') {
      // For T1 (Growth), find signals with tier T1 OR old T2 signals without category
      // This handles both new T1 signals and old T2 signals that map to T1
      whereClause = {
        OR: [
          { tier: 'T1', category: null },
          { tier: 'T2', category: null }
        ],
        publishedAt: todayFilter
      }
    } else {
      // Fallback (shouldn't happen with current schema)
      whereClause = {
        tier: data.tier,
        publishedAt: todayFilter
      }
    }

    // Delete any updates for this tier/category for today only
    await prisma.portfolioDailySignal.deleteMany({
      where: whereClause,
    })

    // Create new update
    // For T1 (Growth), ensure category is explicitly null (not undefined)
    const createData: any = {
      tier: data.tier,
      signal: data.signal,
      executiveSummary: data.executiveSummary || null,
      associatedData: data.associatedData || null,
      createdById: session.user.id
    }
    
    // Only include category for T2 (Elite)
    if (data.tier === 'T2' && data.category) {
      createData.category = data.category
    } else {
      // For T1 (Growth), explicitly set category to null
      createData.category = null
    }
    
    const signal = await prisma.portfolioDailySignal.create({
      data: createData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Send email notifications - await to ensure completion
    // This blocks the API response but ensures emails are sent reliably
    try {
      await sendSignalEmails(signal.id)
      logger.info('Email sending completed successfully', {
        signalId: signal.id,
        tier: signal.tier,
      })
    } catch (error) {
      // Log error but don't fail the API response
      logger.error('Failed to send update emails', error instanceof Error ? error : new Error(String(error)), {
        signalId: signal.id,
        tier: signal.tier,
      })
      console.error('[POST] Failed to send update emails:', error)
    }

    return NextResponse.json(signal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues.map(issue => ({
          path: issue.path,
          message: issue.message
        }))
      }, { status: 400 })
    }
    console.error('Error creating daily update:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
}

