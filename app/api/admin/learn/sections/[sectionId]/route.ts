import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'

export const dynamic = 'force-dynamic'

// GET /api/admin/learn/sections/[sectionId] - Get section details
export async function GET(
  _request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const section = await withDbRetry(
      () =>
        prisma.trackSection.findUnique({
          where: { id: params.sectionId },
          include: {
            lessons: {
              select: { id: true, title: true },
              orderBy: { order: 'asc' }
            }
          }
        }),
      { mode: 'read', operationName: 'admin_learning_section_get' }
    )

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json(section)
  } catch (error) {
    return toPrismaRouteErrorResponse(error, 'Failed to fetch section.')
  }
}

