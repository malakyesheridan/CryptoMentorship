import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'

export const dynamic = 'force-dynamic'

// GET /api/admin/learn/lessons/[lessonId] - Get lesson details
export async function GET(
  _request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lesson = await withDbRetry(
      () =>
        prisma.lesson.findUnique({
          where: { id: params.lessonId },
          include: {
            section: {
              select: { id: true, title: true }
            },
            track: {
              select: { id: true, title: true, slug: true }
            }
          }
        }),
      { mode: 'read', operationName: 'admin_learning_lesson_get' }
    )

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    return NextResponse.json(lesson)
  } catch (error) {
    return toPrismaRouteErrorResponse(error, 'Failed to fetch lesson.')
  }
}

