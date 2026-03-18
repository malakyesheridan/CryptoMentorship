import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const muteSchema = z.object({
  reason: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const json = await request.json()
    const data = muteSchema.parse(json)

    // Check for existing active mute
    const existing = await prisma.userModeration.findFirst({
      where: { userId, action: 'MUTE', isActive: true },
    })

    if (existing) {
      // Unmute
      await prisma.userModeration.update({
        where: { id: existing.id },
        data: { isActive: false },
      })
      return NextResponse.json({ action: 'unmuted' })
    } else {
      // Mute
      const moderation = await prisma.userModeration.create({
        data: {
          userId,
          action: 'MUTE',
          reason: data.reason,
          moderatorId: session.user.id,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      })
      return NextResponse.json({ action: 'muted', moderation })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    console.error('Error toggling mute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
