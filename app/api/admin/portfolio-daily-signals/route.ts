import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createDailySignalSchema = z.object({
  tier: z.enum(['T1', 'T2', 'T3']),
  category: z.enum(['majors', 'memecoins']).optional(),
  signal: z.string().min(1).max(500),
  executiveSummary: z.string().optional(),
  associatedData: z.string().optional(),
}).refine((data) => {
  // Category is required for T3, optional for T1 and T2
  if (data.tier === 'T3') {
    return data.category === 'majors' || data.category === 'memecoins'
  }
  return true
}, {
  message: "Category must be 'majors' or 'memecoins' for T3 tier",
  path: ['category']
})

// GET /api/admin/portfolio-daily-signals - Get all daily signals
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
    console.error('Error fetching daily signals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/portfolio-daily-signals - Create new daily signal (replaces existing for today)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createDailySignalSchema.parse(body)

    // Delete the most recent signal for this tier (and category if T3) to replace it
    // This ensures only one active signal exists per tier/category combination
    const whereClause: any = {
      tier: data.tier,
    }
    
    // For T3, also filter by category
    if (data.tier === 'T3' && data.category) {
      whereClause.category = data.category
    }

    // Find the most recent signal for this tier/category
    const existingSignal = await prisma.portfolioDailySignal.findFirst({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
    })

    // Delete it if it exists
    if (existingSignal) {
      await prisma.portfolioDailySignal.delete({
        where: { id: existingSignal.id },
      })
    }

    // Create new signal
    const signal = await prisma.portfolioDailySignal.create({
      data: {
        ...data,
        createdById: session.user.id
      },
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
    console.error('Error creating daily signal:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
}

