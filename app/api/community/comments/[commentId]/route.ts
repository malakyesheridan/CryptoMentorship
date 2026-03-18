import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { COMMENT_BODY_MAX_LENGTH } from '@/lib/community/constants'

const updateCommentSchema = z.object({
  body: z.string().min(1).max(COMMENT_BODY_MAX_LENGTH),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = await params
    const comment = await prisma.comment.findUnique({ where: { id: commentId } })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not your comment' }, { status: 403 })
    }

    const json = await request.json()
    const data = updateCommentSchema.parse(json)

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body: data.body, editedAt: new Date() },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = await params
    const comment = await prisma.comment.findUnique({ where: { id: commentId } })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'editor'
    if (comment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.comment.delete({ where: { id: commentId } }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
