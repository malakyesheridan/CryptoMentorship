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
  { params }: { params: Promise<{ postId: string }> }
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

    const { postId } = await params
    const json = await request.json()
    const { type } = reactionSchema.parse(json)

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check for existing reaction
    const existing = await prisma.postReaction.findUnique({
      where: {
        postId_userId_type: { postId, userId: session.user.id, type },
      },
    })

    if (existing) {
      // Remove reaction
      await prisma.$transaction([
        prisma.postReaction.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { reactionCount: { decrement: 1 } },
        }),
      ])
      return NextResponse.json({ action: 'removed', type })
    } else {
      // Add reaction
      await prisma.$transaction([
        prisma.postReaction.create({
          data: { postId, userId: session.user.id, type },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { reactionCount: { increment: 1 } },
        }),
      ])
      return NextResponse.json({ action: 'added', type })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error toggling reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
