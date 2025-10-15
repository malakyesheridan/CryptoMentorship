import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const rsvpSchema = z.object({
  status: z.enum(['going', 'interested', 'declined']),
  notes: z.string().optional(),
})

// GET /api/events/[slug] - Get single event by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    const event = await prisma.event.findUnique({
      where: { slug: params.slug },
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
            createdAt: true,
          }
        },
        _count: {
          select: {
            rsvps: {
              where: { status: 'going' }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check visibility
    if (event.visibility === 'admin' && session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    if (event.visibility === 'member' && !session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/events/[slug]/rsvp - RSVP to event
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const body = await request.json()
    const { status, notes } = rsvpSchema.parse(body)

    // Get the event
    const event = await prisma.event.findUnique({
      where: { slug: params.slug },
      include: {
        _count: {
          select: {
            rsvps: {
              where: { status: 'going' }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check capacity if trying to RSVP as "going"
    if (status === 'going' && event.capacity && event._count.rsvps >= event.capacity) {
      return NextResponse.json({ error: 'Event is at capacity' }, { status: 409 })
    }

    // Upsert RSVP
    const rsvp = await prisma.rSVP.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId: event.id
        }
      },
      update: {
        status,
        notes,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        eventId: event.id,
        status,
        notes
      }
    })

    return NextResponse.json(rsvp)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating RSVP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
