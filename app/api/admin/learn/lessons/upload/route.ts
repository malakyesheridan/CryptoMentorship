import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'

// Configure route for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large uploads

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    // Expect JSON with videoUrl (uploaded via blob storage)
    const body = await request.json()
    const title = body.title
    const description = body.description || ''
    const trackId = body.trackId
    const videoUrl = body.videoUrl

    console.log('[Lesson Creation] Request received:', {
      title: title?.substring(0, 50),
      trackId,
      videoUrl: videoUrl ? 'present' : 'missing',
      userId: user.id
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
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    })

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
    const existingLesson = await prisma.lesson.findUnique({
      where: { 
        trackId_slug: {
          trackId: trackId,
          slug: slug
        }
      }
    })
    
    if (existingLesson) {
      return NextResponse.json(
        { error: 'A lesson with this title already exists in this track' },
        { status: 400 }
      )
    }

    // Get max order for lessons in this track
    const maxOrder = await prisma.lesson.findFirst({
      where: { 
        trackId: trackId,
        sectionId: null
      },
      orderBy: { order: 'desc' },
      select: { order: true }
    })
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
          contentMDX: description?.trim() || `# ${title.trim()}\n\n${description?.trim() || ''}`,
          videoUrl: videoUrl.trim(),
          durationMin: null,
          resources: null,
          publishedAt: new Date(),
          order: order,
        }
      })
      
      console.log('[Lesson Creation] Lesson created successfully:', created.id)
      
      // Audit log within transaction (non-blocking - won't fail transaction if audit fails)
      try {
        await logAudit(
          tx,
          user.id,
          'create',
          'lesson',
          created.id,
          { title: created.title, trackId: trackId }
        )
        console.log('[Lesson Creation] Audit log created successfully')
      } catch (auditError) {
        // Log but don't fail the transaction
        console.error('[Lesson Creation] Audit logging failed (non-blocking):', auditError)
      }
      
      return created
    })
    
    console.log('[Lesson Creation] Transaction completed successfully')
    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        videoUrl: lesson.videoUrl
      }
    })
  } catch (error) {
    return handleError(error)
  }
}

