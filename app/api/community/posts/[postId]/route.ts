import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { getPostById, updatePost, deletePost } from '@/lib/community/queries'
import { z } from 'zod'
import { POST_BODY_MAX_LENGTH } from '@/lib/community/constants'

const updatePostSchema = z.object({
  body: z.string().min(1).max(POST_BODY_MAX_LENGTH).optional(),
  imageUrl: z.string().url().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { postId } = await params
    const post = await getPostById(postId, session?.user?.id)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const post = await prisma.post.findUnique({ where: { id: postId } })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Not your post' }, { status: 403 })
    }

    // 15-minute edit window
    const fifteenMin = 15 * 60 * 1000
    if (Date.now() - post.createdAt.getTime() > fifteenMin) {
      return NextResponse.json({ error: 'Edit window has expired' }, { status: 403 })
    }

    const json = await request.json()
    const data = updatePostSchema.parse(json)
    const updated = await updatePost(postId, data)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await params
    const post = await prisma.post.findUnique({ where: { id: postId } })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'editor'
    if (post.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deletePost(postId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
