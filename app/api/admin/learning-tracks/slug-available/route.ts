import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'
import { buildTrackSlugSuggestion, normalizeTrackSlug } from '@/lib/learning/track-slug'

async function requireLearningAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
    return null
  }
  return session.user
}

async function trackSlugExists(slug: string): Promise<boolean> {
  const existing = await withDbRetry(
    () =>
      prisma.track.findUnique({
        where: { slug },
        select: { id: true },
      }),
    { mode: 'read', operationName: 'track_slug_available_check' }
  )

  return !!existing
}

export async function GET(request: NextRequest) {
  const user = await requireLearningAdmin()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawSlug = request.nextUrl.searchParams.get('slug') || ''
    const slug = normalizeTrackSlug(rawSlug)

    if (!slug) {
      return NextResponse.json(
        {
          available: false,
          error: 'invalid_slug',
          message: 'Please enter a valid slug.',
        },
        { status: 400 }
      )
    }

    const available = !(await trackSlugExists(slug))
    if (available) {
      return NextResponse.json({ available: true })
    }

    const suggestion = await buildTrackSlugSuggestion(slug, trackSlugExists)
    return NextResponse.json({
      available: false,
      suggestion,
    })
  } catch (error) {
    return toPrismaRouteErrorResponse(error, 'Failed to validate track slug.')
  }
}

