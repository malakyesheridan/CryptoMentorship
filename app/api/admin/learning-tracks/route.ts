import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'
import { buildTrackSlugSuggestion, normalizeTrackSlug } from '@/lib/learning/track-slug'
import { emit } from '@/lib/events'

const PdfResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
})

const CreateTrackSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  summary: z.string().optional(),
  coverUrl: z.string().url().optional(),
  pdfResources: z.array(PdfResourceSchema).optional(),
  minTier: z.enum(['guest', 'member', 'editor', 'admin']).optional(),
  publishedAt: z.string().datetime().optional(),
  requestId: z.string().optional(),
})

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
    { mode: 'read', operationName: 'track_slug_exists' }
  )
  return !!existing
}

export async function GET() {
  const user = await requireLearningAdmin()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tracks = await withDbRetry(
      () =>
        prisma.track.findMany({
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
            createdAt: true,
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        }),
      { mode: 'read', operationName: 'learning_tracks_list' }
    )

    return NextResponse.json({ tracks })
  } catch (error) {
    return toPrismaRouteErrorResponse(error, 'Failed to load learning tracks.')
  }
}

export async function POST(request: NextRequest) {
  const user = await requireLearningAdmin()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 })
  }

  let requestedSlug = 'track'

  try {
    const body = await request.json()
    const parsed = CreateTrackSchema.parse(body)
    const slug = normalizeTrackSlug(parsed.slug || parsed.title)
    requestedSlug = slug || requestedSlug

    if (!slug) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Track slug is required.',
        },
        { status: 400 }
      )
    }

    const exists = await trackSlugExists(slug)
    if (exists) {
      const suggestion = await buildTrackSlugSuggestion(slug, trackSlugExists)
      return NextResponse.json(
        {
          error: 'slug_taken',
          message: 'Slug already exists',
          suggestion,
        },
        { status: 409 }
      )
    }

    const track = await withDbRetry(
      () =>
        prisma.track.create({
          data: {
            title: parsed.title.trim(),
            slug,
            summary: parsed.summary?.trim() || null,
            coverUrl: parsed.coverUrl,
            pdfResources: parsed.pdfResources,
            minTier: parsed.minTier ?? 'member',
            publishedAt: parsed.publishedAt ? new Date(parsed.publishedAt) : null,
          },
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
          },
        }),
      {
        mode: 'idempotent-write',
        idempotencyKey: `learning-track:${slug}`,
        operationName: 'learning_track_create',
      }
    )

    void logAudit(prisma, user.id, 'create', 'track', track.id, {
      title: track.title,
      slug: track.slug,
      requestId: parsed.requestId ?? null,
    })

    if (track.publishedAt) {
      void emit({
        type: 'learning_hub_published',
        subjectType: 'track',
        subjectId: track.id,
        title: track.title,
        url: `/learn/${track.slug}`,
      }).catch((error) => {
        console.error('Failed to emit learning track publish event:', error)
      })
    }

    return NextResponse.json({ success: true, track }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const suggestion = await buildTrackSlugSuggestion(requestedSlug, trackSlugExists)
      return NextResponse.json(
        {
          error: 'slug_taken',
          message: 'Slug already exists',
          suggestion,
        },
        { status: 409 }
      )
    }

    return toPrismaRouteErrorResponse(error, 'Failed to create learning track.')
  }
}
