import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

const createSignalSchema = z.object({
  symbol: z.string().min(1).max(10),
  market: z.string().default('crypto:spot'),
  direction: z.enum(['long', 'short']),
  thesis: z.string().optional(),
  tags: z.array(z.string()).default([]),
  entryTime: z.string().transform(str => new Date(str)),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  riskPct: z.number().min(0).max(100).optional(),
})

const updateSignalSchema = z.object({
  symbol: z.string().min(1).max(10).optional(),
  market: z.string().optional(),
  direction: z.enum(['long', 'short']).optional(),
  thesis: z.string().optional(),
  tags: z.array(z.string()).optional(),
  entryTime: z.string().transform(str => new Date(str)).optional(),
  entryPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  conviction: z.number().int().min(1).max(5).optional(),
  riskPct: z.number().min(0).max(100).optional(),
  status: z.enum(['open', 'closed']).optional(),
  exitTime: z.string().transform(str => new Date(str)).optional(),
  exitPrice: z.number().positive().optional(),
  notes: z.string().optional(),
})

// GET /api/admin/signals - Get all signals with filters
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
    
    if (startDate || endDate) {
      where.entryTime = {}
      if (startDate) {
        where.entryTime.gte = new Date(startDate)
      }
      if (endDate) {
        where.entryTime.lte = new Date(endDate)
      }
    }

    // Get signals
    const signals = await prisma.signalTrade.findMany({
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

// POST /api/admin/signals - Create new signal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
      console.log('POST /api/admin/signals - Request body:', body)
    } catch (error) {
      console.error('JSON parse error:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    let data
    try {
      data = createSignalSchema.parse(body)
      console.log('POST /api/admin/signals - Parsed data:', data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.issues)
        return NextResponse.json({ 
          error: 'Invalid input', 
          details: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message
          }))
        }, { status: 400 })
      }
      throw error
    }

    // Generate slug with collision handling
    const dateStr = data.entryTime.toISOString().split('T')[0]
    let baseSlug = `${data.symbol.toLowerCase()}-${data.direction}-${dateStr}`
    let slug = baseSlug
    let attempt = 0

    // Check for existing slug and append number if needed
    while (attempt < 100) {
      const existing = await prisma.signalTrade.findUnique({
        where: { slug },
        select: { id: true }
      })

      if (!existing) {
        break // Slug is available
      }

      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    if (attempt >= 100) {
      // Fallback to timestamp-based slug
      slug = `${baseSlug}-${Date.now()}`
    }

    console.log('Creating signal with slug:', slug)

    // Create signal
    const signal = await prisma.signalTrade.create({
      data: {
        ...data,
        tags: JSON.stringify(data.tags),
        slug,
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

    console.log('Signal created successfully:', signal.id)
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
    
    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      console.error('Slug collision error:', error)
      return NextResponse.json({ 
        error: 'A signal with this slug already exists. Please try again.' 
      }, { status: 409 })
    }
    
    console.error('Error creating signal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
