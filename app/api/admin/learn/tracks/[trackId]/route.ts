import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'

// GET /api/admin/learn/tracks/[trackId] - Get track details
export async function GET(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const track = await withDbRetry(
      () =>
        prisma.track.findUnique({
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
        }),
      { mode: 'read', operationName: 'admin_learning_track_get' }
    )

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    return NextResponse.json(track, {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    return toPrismaRouteErrorResponse(error, 'Failed to fetch track.')
  }
}
