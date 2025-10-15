import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { revalidateDashboard } from '@/lib/revalidate'
import { z } from 'zod'

const bookmarkSchema = z.object({
  contentId: z.string().optional(),
  episodeId: z.string().optional(),
  note: z.string().optional(),
})

// GET /api/me/bookmarks - Get user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            excerpt: true,
            kind: true,
            publishedAt: true,
            locked: true,
            tags: true,
          }
        },
        episode: {
          select: {
            id: true,
            title: true,
            excerpt: true,
            publishedAt: true,
            locked: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.bookmark.count({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      bookmarks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    })
  } catch (error) {
    console.error('Error fetching bookmarks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/me/bookmarks - Create a bookmark
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, episodeId, note } = bookmarkSchema.parse(body)

    // Validate that exactly one of contentId or episodeId is provided
    if (!contentId && !episodeId) {
      return NextResponse.json({ error: 'Either contentId or episodeId is required' }, { status: 400 })
    }
    if (contentId && episodeId) {
      return NextResponse.json({ error: 'Only one of contentId or episodeId can be provided' }, { status: 400 })
    }

    // Check if bookmark already exists
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        userId: session.user.id,
        contentId: contentId || null,
        episodeId: episodeId || null,
      }
    })

    if (existingBookmark) {
      return NextResponse.json({ error: 'Bookmark already exists' }, { status: 409 })
    }

    // Verify the content/episode exists and user has access
    if (contentId) {
      const content = await prisma.content.findUnique({
        where: { id: contentId }
      })
      if (!content) {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
    }

    if (episodeId) {
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId }
      })
      if (!episode) {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId: session.user.id,
        contentId,
        episodeId,
        note,
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            excerpt: true,
            kind: true,
            publishedAt: true,
            locked: true,
            tags: true,
          }
        },
        episode: {
          select: {
            id: true,
            title: true,
            excerpt: true,
            publishedAt: true,
            locked: true,
          }
        }
      }
    })

    await revalidateDashboard(session.user.id)

    return NextResponse.json(bookmark, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating bookmark:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/me/bookmarks - Remove a bookmark
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    const episodeId = searchParams.get('episodeId')

    if (!contentId && !episodeId) {
      return NextResponse.json({ error: 'Either contentId or episodeId is required' }, { status: 400 })
    }

    const bookmark = await prisma.bookmark.findFirst({
      where: {
        userId: session.user.id,
        contentId: contentId || null,
        episodeId: episodeId || null,
      }
    })

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
    }

    await prisma.bookmark.delete({
      where: { id: bookmark.id }
    })

    await revalidateDashboard(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bookmark:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
