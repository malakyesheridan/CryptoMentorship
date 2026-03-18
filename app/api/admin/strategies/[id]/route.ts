import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().optional(),
  configJson: z.string().nullable().optional(),
})

// GET /api/admin/strategies/[id] - Fetch strategy detail for admin edit
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    return NextResponse.json(strategy)
  } catch (error) {
    console.error('Error fetching strategy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/strategies/[id] - Update strategy metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const strategy = await prisma.strategy.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.configJson !== undefined && { configJson: data.configJson }),
      },
    })

    return NextResponse.json(strategy)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error updating strategy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
