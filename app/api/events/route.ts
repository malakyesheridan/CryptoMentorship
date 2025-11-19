import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// Cache for 60 seconds - events update periodically
export const revalidate = 60
import { z } from 'zod'

const rsvpSchema = z.object({
  status: z.enum(['going', 'interested', 'declined']),
  notes: z.string().optional(),
})

// GET /api/events - Get events with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const scope = searchParams.get('scope') || 'upcoming'
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')
    const visibility = searchParams.get('visibility') || 'member'
    const locationType = searchParams.get('locationType')
    const hostId = searchParams.get('hostId')
    const month = searchParams.get('month')

    // Build where clause
    const where: any = {}
    
    // Visibility filter
    if (session?.user?.role === 'admin') {
      // Admins can see all events
    } else if (session?.user?.role === 'editor') {
      where.visibility = { in: ['public', 'member'] }
    } else {
      where.visibility = visibility
    }

    // Scope filter (upcoming vs past)
    const now = new Date()
    if (scope === 'upcoming') {
      where.startAt = { gte: now }
    } else if (scope === 'past') {
      where.startAt = { lt: now }
    }

    // Additional filters
    if (locationType) {
      where.locationType = locationType
    }
    
    if (hostId) {
      where.hostUserId = hostId
    }
    
    if (month) {
      const monthStart = new Date(month + '-01')
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      where.startAt = {
        gte: monthStart,
        lt: monthEnd
      }
    }

    // Get events
    const events = await prisma.event.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        rsvps: {
          where: session?.user?.id ? { userId: session.user.id } : undefined,
          select: {
            status: true,
            notes: true,
          }
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'going' }
            }
          }
        }
      },
      orderBy: scope === 'upcoming' ? { startAt: 'asc' } : { startAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = events.length > limit
    const items = hasNextPage ? events.slice(0, -1) : events
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null

    return NextResponse.json({
      events: items,
      pagination: {
        hasNextPage,
        nextCursor,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
