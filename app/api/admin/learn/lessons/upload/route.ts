import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'
import { withDbRetry } from '@/lib/db/retry'
import { toPrismaRouteErrorResponse } from '@/lib/db/errors'
import { emit } from '@/lib/events'

// Configure route for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large uploads

export async function POST(request: NextRequest) {
  let uploadRequestId: string | null = null
  let userId: string | null = null
  try {
    const user = await requireRole(['admin', 'editor'])
    userId = user.id
    
    // Expect JSON with videoUrl (uploaded via blob storage)
    const body = await request.json()
    const title = body.title
    const description = body.description || ''
    const trackId = body.trackId
    const videoUrl = body.videoUrl
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : ''
    const durationSeconds = body.duration ? parseInt(body.duration) : null
    const durationMin = durationSeconds ? Math.round(durationSeconds / 60) : null
    const pdfResources = Array.isArray(body.pdfResources)
      ? body.pdfResources.filter((item: any) => item?.title && item?.url)
      : []
    uploadRequestId = body.uploadRequestId || `lesson_upload_${nanoid(8)}`
    const uploadMeta = body.uploadMeta || null

    console.log('[Lesson Creation] Request received:', {
      title: title?.substring(0, 50),
      trackId,
      videoUrl: videoUrl ? 'present' : 'missing',
      userId: user.id
    })
    
    logger.info('Lesson upload finalize requested', {
      uploadRequestId,
      trackId,
      hasVideoUrl: !!videoUrl,
      durationSeconds,
      uploadMeta
    })

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!videoUrl || !videoUrl.trim()) {
      return NextResponse.json(
        { error: 'Video URL is required. Please upload the video first.' },
        { status: 400 }
      )
    }

    if (!trackId || !trackId.trim()) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      )
    }

    // Check if track exists
    const track = await withDbRetry(
      () =>
        prisma.track.findUnique({
          where: { id: trackId }
        }),
      { mode: 'read', operationName: 'learning_lesson_upload_track_lookup' }
    )

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Check slug uniqueness within track
    const existingLesson = await withDbRetry(
      () =>
        prisma.lesson.findUnique({
          where: {
            trackId_slug: {
              trackId: trackId,
              slug: slug
            }
          }
        }),
      { mode: 'read', operationName: 'learning_lesson_upload_slug_check' }
    )
    
    if (existingLesson) {
      return NextResponse.json(
        { error: 'A lesson with this title already exists in this track' },
        { status: 400 }
      )
    }

    // Get max order for lessons in this track
    const maxOrder = await withDbRetry(
      () =>
        prisma.lesson.findFirst({
          where: {
            trackId: trackId,
            sectionId: null
          },
          orderBy: { order: 'desc' },
          select: { order: true }
        }),
      { mode: 'read', operationName: 'learning_lesson_upload_order_lookup' }
    )
    const order = (maxOrder?.order ?? -1) + 1

    // Wrap in transaction for atomicity
    const lesson = await prisma.$transaction(async (tx) => {
      console.log('[Lesson Creation] Starting transaction...')
      
      const created = await tx.lesson.create({
        data: {
          trackId: trackId,
          sectionId: null,
          slug: slug,
          title: title.trim(),
          contentMDX: description?.trim() || '', // Optional - can be empty for video-only lessons
          videoUrl: videoUrl.trim(),
          coverUrl: coverUrl || undefined,
          durationMin: durationMin,
          pdfResources: pdfResources.length > 0 ? pdfResources : undefined,
          publishedAt: new Date(),
          order: order,
        }
      })
      
      console.log('[Lesson Creation] Lesson created successfully:', created.id)
      logger.info('Lesson upload finalized', {
        uploadRequestId,
        lessonId: created.id,
        trackId: created.trackId,
        videoUrl: created.videoUrl
      })
      
      return created
    })
    
    console.log('[Lesson Creation] Transaction completed successfully')
    void logAudit(prisma, user.id, 'create', 'lesson', lesson.id, {
      title: lesson.title,
      trackId: trackId,
      uploadRequestId,
    })

    if (lesson.publishedAt) {
      void emit({
        type: 'learning_hub_published',
        subjectType: 'lesson',
        subjectId: lesson.id,
        title: lesson.title,
        url: `/learn/${track.slug}/lesson/${lesson.slug}`,
      }).catch((error) => {
        console.error('Failed to emit lesson publish event:', error)
      })
    }

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        videoUrl: lesson.videoUrl,
        coverUrl: lesson.coverUrl
      }
    })
  } catch (error) {
    logger.error('Lesson upload finalize failed', error instanceof Error ? error : undefined, {
      error: error instanceof Error ? error.message : String(error)
    })
    if (userId && uploadRequestId) {
      logAudit(prisma, userId, 'upload_error', 'learning_upload', undefined, {
        requestId: uploadRequestId,
        error: error instanceof Error ? error.message : String(error)
      }).catch(() => {})
    }
    return toPrismaRouteErrorResponse(error, 'Failed to finalize lesson upload.')
  }
}

