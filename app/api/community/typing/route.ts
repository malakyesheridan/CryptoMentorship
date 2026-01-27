import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { broadcastTyping } from '@/lib/community/sse'
import { requireActiveSubscription } from '@/lib/access'

const postBody = z.object({
  channelId: z.string().min(1),
  isTyping: z.boolean(),
})

export async function POST(req: NextRequest) {
  const session = await requireActiveSubscription('api')

  const body = await req.json().catch(() => ({}))
  const parsed = postBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_BODY', message: 'Invalid payload' },
      { status: 400 },
    )
  }

  const { channelId, isTyping } = parsed.data

  // Get user info first (faster query)
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true },
  })

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'USER_NOT_FOUND', message: 'User not found' },
      { status: 404 },
    )
  }

  // Verify channel exists (only if we need to validate)
  // For typing indicators, we can skip this check to improve performance
  // The SSE endpoint will handle invalid channels

  // Broadcast typing indicator
  broadcastTyping(channelId, user.id, user.name ?? 'Anonymous', isTyping)

  return NextResponse.json({ ok: true })
}
