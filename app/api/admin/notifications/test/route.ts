import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { enqueueEmail } from '@/lib/email/outbox'
import {
  getNotificationPrefs,
  canSendEmailFromPrefs,
} from '@/lib/notifications/preferences'
import {
  buildNotificationDedupeKey,
  notificationEmailTypes,
  type NotificationEvent,
} from '@/lib/notifications/types'

const schema = z.object({
  type: z.enum(notificationEmailTypes),
  email: z.string().email(),
  subjectId: z.string().min(1).optional(),
  actorId: z.string().optional(),
  title: z.string().optional(),
  url: z.string().url().optional(),
  snippet: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const input = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: `User not found for email ${input.email}` },
        { status: 404 }
      )
    }

    const prefs = await getNotificationPrefs(user.id)
    const eligible = canSendEmailFromPrefs(input.type, prefs)

    const subjectId = input.subjectId || `admin-test-${Date.now()}`
    const event: NotificationEvent = {
      type: input.type,
      subjectId,
      actorId: input.actorId || session.user.id,
      recipientUserId: user.id,
      metadata: {
        title: input.title,
        url: input.url,
        snippet: input.snippet,
        source: 'admin-test-endpoint',
      },
    }

    let outbox: { id: string; queued: boolean; reason?: string } | null = null

    if (eligible) {
      const dedupeKey = `${buildNotificationDedupeKey(event, user.id)}:test:${Date.now()}`
      const result = await enqueueEmail({
        to: user.email,
        userId: user.id,
        templateKey: input.type,
        subject: input.title || `[Test] ${input.type}`,
        variables: {
          title: input.title || `Test notification: ${input.type}`,
          url: input.url || `${request.nextUrl.origin}/notifications`,
          snippet: input.snippet || 'This is a test notification payload.',
          actorName: session.user.name || 'Admin',
          preferencesUrl: `${request.nextUrl.origin}/account`,
        },
        dedupeKey,
      })

      outbox = {
        id: result.id || '',
        queued: result.queued,
        reason: result.reason,
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      prefs,
      eligible,
      outbox,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to run notification test',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
