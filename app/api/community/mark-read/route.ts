import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'

export const dynamic = 'force-dynamic'

const markReadBody = z.object({
  channelId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await requireActiveSubscription('api')
  try {

    const body = await req.json().catch(() => ({}))
    const parsed = markReadBody.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: 'BAD_BODY', message: 'Invalid payload' },
        { status: 400 }
      )
    }

    const { channelId } = parsed.data

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true }
    })

    if (!channel) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Channel not found' },
        { status: 404 }
      )
    }

    // Upsert channel read record
    await prisma.channelRead.upsert({
      where: {
        userId_channelId: {
          userId: session.id,
          channelId: channelId
        }
      },
      update: {
        lastReadAt: new Date()
      },
      create: {
        userId: session.id,
        channelId: channelId,
        lastReadAt: new Date()
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error marking channel as read:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to mark channel as read' },
      { status: 500 }
    )
  }
}

