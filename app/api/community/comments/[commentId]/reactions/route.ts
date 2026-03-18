import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'
import { prisma } from '@/lib/prisma'
import { ReactionType } from '@prisma/client'
import { z } from 'zod'

const reactionSchema = z.object({
  type: z.nativeEnum(ReactionType),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isActive = await hasActiveSubscription(session.user.id)
    if (!isActive) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    const { commentId } = await params
    const json = await request.json()
    const { type } = reactionSchema.parse(json)

    const comment = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_type: { commentId, userId: session.user.id, type },
      },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.commentReaction.delete({ where: { id: existing.id } }),
        prisma.comment.update({
          where: { id: commentId },
          data: { reactionCount: { decrement: 1 } },
        }),
      ])
      return NextResponse.json({ action: 'removed', type })
    } else {
      await prisma.$transaction([
        prisma.commentReaction.create({
          data: { commentId, userId: session.user.id, type },
        }),
        prisma.comment.update({
          where: { id: commentId },
          data: { reactionCount: { increment: 1 } },
        }),
      ])
      return NextResponse.json({ action: 'added', type })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error toggling comment reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
