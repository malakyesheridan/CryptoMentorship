import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/learn/tracks/[trackId] - Get track details
export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const track = await prisma.track.findUnique({
      where: { id: params.trackId },
      include: {
        sections: {
          include: {
            lessons: {
              select: { id: true, title: true, slug: true, publishedAt: true, order: true, videoUrl: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        lessons: {
          where: { sectionId: null },
          select: { id: true, title: true, slug: true, publishedAt: true, order: true, videoUrl: true, sectionId: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            sections: true,
            lessons: true
          }
        }
      }
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    return NextResponse.json(track)
  } catch (error) {
    console.error('Error fetching track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
