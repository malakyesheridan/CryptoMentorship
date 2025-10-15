import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { emit } from '@/lib/events'
import { z } from 'zod'

const announceSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  url: z.string().max(500).optional(),
})

// POST /api/admin/announce - Send announcement to all members
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestBody = await request.json()
    const { title, body, url } = announceSchema.parse(requestBody)

    // Emit announcement event
    await emit({
      type: 'announcement',
      title,
      body,
      url,
    })

    // Log audit entry
    await prisma.audit.create({
      data: {
        actorId: session.user.id,
        action: 'announcement_sent',
        subjectType: 'announcement',
        metadata: JSON.stringify({
          title,
          body: body || null,
          url: url || null,
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error sending announcement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
