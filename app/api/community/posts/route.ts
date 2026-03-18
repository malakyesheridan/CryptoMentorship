import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { hasActiveSubscription } from '@/lib/access'
import { getPosts, createPost } from '@/lib/community/queries'
import { canUserPost } from '@/lib/community/moderation'
import { PostCategory } from '@prisma/client'
import { z } from 'zod'
import { POST_BODY_MAX_LENGTH } from '@/lib/community/constants'

const createPostSchema = z.object({
  body: z.string().min(1).max(POST_BODY_MAX_LENGTH),
  category: z.nativeEnum(PostCategory).default('GENERAL'),
  imageUrl: z.string().url().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category') as PostCategory | null
    const cursor = searchParams.get('cursor') ?? undefined
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const validCategories = Object.values(PostCategory)
    const parsedCategory = category && validCategories.includes(category) ? category : undefined

    const result = await getPosts({
      category: parsedCategory,
      cursor,
      limit,
      currentUserId: session?.user?.id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const json = await request.json()
    const data = createPostSchema.parse(json)

    // Only admin/editor can post announcements
    if (data.category === 'ANNOUNCEMENTS') {
      const role = session.user.role
      if (role !== 'admin' && role !== 'editor') {
        return NextResponse.json({ error: 'Only admins can post announcements' }, { status: 403 })
      }
    }

    const post = await createPost({
      authorId: session.user.id,
      category: data.category,
      body: data.body,
      imageUrl: data.imageUrl,
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
