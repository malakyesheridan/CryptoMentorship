import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { emit } from '@/lib/events'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  summary: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().min(1),
  visibility: z.enum(['public', 'member', 'admin']),
  locationType: z.enum(['online', 'in_person']),
  locationText: z.string().max(200).optional(),
  joinUrl: z.string().url().optional().or(z.literal('')),
  capacity: z.number().min(1).optional(),
  hostUserId: z.string().optional(),
  recordingUrl: z.string().url().optional().or(z.literal('')),
  resources: z.array(z.object({
    title: z.string().min(1),
    url: z.string().url()
  })).optional(),
})

// POST /api/admin/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = eventSchema.parse(body)

    // Check if slug is unique
    const existingEvent = await prisma.event.findUnique({
      where: { slug: data.slug }
    })

    if (existingEvent) {
      return NextResponse.json({ error: 'Event slug already exists' }, { status: 409 })
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        hostUserId: data.hostUserId || session.user.id,
        resources: data.resources ? JSON.stringify(data.resources) : null,
      }
    })

    // Emit notification for new event (if it's visible to members)
    if (data.visibility !== 'admin' && new Date(data.startAt) > new Date()) {
      await emit({
        type: 'announcement',
        title: `New live session: ${data.title}`,
        body: data.summary || `Join us for "${data.title}" on ${new Date(data.startAt).toLocaleDateString()}`,
        url: `/events/${data.slug}`
      })
    }

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
