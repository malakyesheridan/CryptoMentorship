import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'
import { canUserPost } from '@/lib/community/moderation'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { COMMENT_BODY_MAX_LENGTH, COMMENTS_PER_PAGE, MAX_COMMENT_DEPTH } from '@/lib/community/constants'

const createCommentSchema = z.object({
  body: z.string().min(1).max(COMMENT_BODY_MAX_LENGTH),
  parentId: z.string().optional(),
  imageUrl: z.string().url().optional(),
})

const commentAuthorSelect = {
  id: true,
  name: true,
  image: true,
  role: true,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { postId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') ?? undefined
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    // Get top-level comments
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
        isShadowHidden: false,
      },
      include: {
        author: { select: commentAuthorSelect },
        reactions: session?.user?.id
          ? { where: { userId: session.user.id }, select: { type: true } }
          : false,
        _count: { select: { replies: true, reactions: true } },
        replies: {
          where: { isShadowHidden: false },
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: commentAuthorSelect },
            reactions: session?.user?.id
              ? { where: { userId: session.user.id }, select: { type: true } }
              : false,
            _count: { select: { replies: true, reactions: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasNextPage = comments.length > limit
    const items = comments.slice(0, limit).map(formatComment)
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : undefined

    return NextResponse.json({ comments: items, hasNextPage, nextCursor })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const canPost = await canUserPost(session.user.id)
    if (!canPost.allowed) {
      return NextResponse.json({ error: canPost.reason }, { status: 403 })
    }

    const { postId } = await params
    const json = await request.json()
    const data = createCommentSchema.parse(json)

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // If replying to a comment, check depth
    let depth = 0
    if (data.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: data.parentId } })
      if (!parent || parent.postId !== postId) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
      depth = parent.depth + 1
      if (depth > MAX_COMMENT_DEPTH) {
        return NextResponse.json({ error: 'Maximum nesting depth reached' }, { status: 400 })
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          authorId: session.user.id,
          parentId: data.parentId,
          body: data.body,
          imageUrl: data.imageUrl,
          depth,
        },
        include: {
          author: { select: commentAuthorSelect },
          _count: { select: { replies: true, reactions: true } },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ])

    return NextResponse.json(formatComment(comment), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatComment(comment: any): any {
  return {
    ...comment,
    replyCount: comment._count?.replies ?? 0,
    reactionCount: comment._count?.reactions ?? comment.reactionCount ?? 0,
    userReactions: (comment.reactions ?? []).map((r: any) => r.type),
    replies: comment.replies?.map(formatComment) ?? [],
    _count: undefined,
    reactions: undefined,
  }
}
