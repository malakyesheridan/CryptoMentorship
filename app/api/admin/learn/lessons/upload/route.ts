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
      const created = await tx.lesson.create({
        data: {
          trackId: trackId,
          sectionId: null,
          slug: slug,
          title: title.trim(),
          contentMDX: description?.trim() || `# ${title.trim()}\n\n${description?.trim() || ''}`,
          videoUrl: videoUrl,
          durationMin: null,
          resources: null,
          publishedAt: new Date(),
          order: order,
        }
      })
      
      // Audit log within transaction
      await logAudit(
        tx,
        user.id,
        'create',
        'lesson',
        created.id,
        { title: created.title, trackId: trackId }
      )
      
      return created
    })
    
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

