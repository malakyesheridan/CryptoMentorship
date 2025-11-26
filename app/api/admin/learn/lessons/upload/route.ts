import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { sanitizeFilename } from '@/lib/file-validation'

// Configure route for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large uploads

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    // Handle FormData for file upload
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const trackId = formData.get('trackId') as string

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      )
    }

    if (!trackId || !trackId.trim()) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    const maxFileSize = 100 * 1024 * 1024 // 100MB in bytes
    if (videoFile.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB` },
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

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'uploads', 'lessons')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save video file
    const safeFilename = sanitizeFilename(videoFile.name)
    const timestamp = Date.now()
    const filename = `${timestamp}-${safeFilename}`
    const filePath = join(uploadDir, filename)
    
    const bytes = await videoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    const videoUrl = `/uploads/lessons/${filename}`

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

