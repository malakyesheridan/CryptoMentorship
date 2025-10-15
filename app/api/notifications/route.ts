import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/notifications - Get user's notifications with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter') || 'all'

    // Build where clause based on filter
    const where: any = { userId: session.user.id }
    
    if (filter === 'unread') {
      where.readAt = null
    } else if (filter === 'mentions') {
      where.type = 'mention'
    } else if (filter === 'content') {
      where.type = { in: ['research_published', 'episode_published', 'signal_published'] }
    }

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: [
        { readAt: 'asc' }, // Unread first
        { createdAt: 'desc' }
      ],
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = notifications.length > limit
    const items = hasNextPage ? notifications.slice(0, -1) : notifications
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

    return NextResponse.json({
      notifications: items,
      pagination: {
        hasNextPage,
        nextCursor,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notifications/mark-read - Mark specific notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(body)

    if (ids.length === 0) {
      return NextResponse.json({ success: true })
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
