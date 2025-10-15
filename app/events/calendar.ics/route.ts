import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildICSFeed } from '@/lib/ics'

export const dynamic = 'force-dynamic'

// GET /events/calendar.ics - Public calendar feed
export async function GET(request: NextRequest) {
  try {
    // Get upcoming member-visible events
    const now = new Date()
    const events = await prisma.event.findMany({
      where: {
        startAt: { gte: now },
        visibility: { in: ['public', 'member'] }
      },
      include: {
        host: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { startAt: 'asc' },
      take: 100 // Limit to prevent huge feeds
    })

    const icsContent = buildICSFeed(events)
    
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="crypto-portal-events.ics"',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('Error generating calendar feed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
