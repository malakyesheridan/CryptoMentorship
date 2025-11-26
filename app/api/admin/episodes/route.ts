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
import { z } from 'zod'

// Configure route for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large uploads

// Schema for PUT requests (updates)
const episodeUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  slug: z.string().min(1, 'Slug is required').optional(),
  excerpt: z.string().optional(),
  videoUrl: z.string().url('Valid video URL is required').optional(),
  body: z.string().optional(),
  coverUrl: z.string().optional(),
  category: z.enum(['daily-update', 'analysis', 'breakdown']).optional(),
  locked: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    // Check content type to handle both FormData and JSON
    const contentType = request.headers.get('content-type') || ''
    
    let title: string
    let description: string
    let slug: string
    let videoFile: File | null = null
    let videoUrl: string | null = null

    if (contentType.includes('application/json')) {
      // JSON request (from chunked upload)
      const body = await request.json()
      title = body.title
      description = body.description || ''
      slug = body.slug
      videoUrl = body.videoUrl
    } else {
      // FormData request (direct upload for small files)
      const formData = await request.formData()
      videoFile = formData.get('video') as File
      title = formData.get('title') as string
      description = formData.get('description') as string
      slug = formData.get('slug') as string
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    // If videoFile is provided, upload it (small files only)
    if (videoFile) {
      // Validate file size (100MB limit)
      const maxFileSize = 100 * 1024 * 1024 // 100MB in bytes
      if (videoFile.size > maxFileSize) {
        return NextResponse.json(
          { error: `File too large. Maximum size is 100MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB` },
          { status: 400 }
        )
      }

      // Ensure upload directory exists
      const uploadDir = join(process.cwd(), 'uploads', 'episodes')
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
      
      videoUrl = `/uploads/episodes/${filename}`
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }
    
    // Check if slug is unique
    const existingEpisode = await prisma.episode.findUnique({
      where: { slug }
    })
    
    if (existingEpisode) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }
    
    // Wrap in transaction for atomicity
    const episode = await prisma.$transaction(async (tx) => {
      const created = await tx.episode.create({
        data: {
          title: title.trim(),
          slug: slug.trim(),
          excerpt: description?.trim() || null,
          videoUrl,
          body: null,
          coverUrl: null,
          category: 'daily-update',
          locked: false, // Always false - everyone can view
          publishedAt: new Date(),
        }
      })
      
      // Audit log within transaction
      await logAudit(
        tx,
        user.id,
        'create',
        'episode',
        created.id,
        { title: created.title }
      )
      
      return created
    })
    
    return NextResponse.json(episode)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const body = await request.json()
    const { id, ...updateData } = body
    
    // Always set locked to false
    if ('locked' in updateData) {
      updateData.locked = false
    }
    
    const validatedData = episodeUpdateSchema.parse(updateData)
    
    if (!id) {
      return NextResponse.json(
        { error: 'Episode ID is required' },
        { status: 400 }
      )
    }
    
    // Check if episode exists
    const existingEpisode = await prisma.episode.findUnique({
      where: { id }
    })
    
    if (!existingEpisode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }
    
    // Check slug uniqueness if slug is being updated
    if (validatedData.slug && validatedData.slug !== existingEpisode.slug) {
      const slugExists = await prisma.episode.findUnique({
        where: { slug: validatedData.slug }
      })
      
      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        )
      }
    }
    
    // Wrap in transaction for atomicity
    const episode = await prisma.$transaction(async (tx) => {
      const updated = await tx.episode.update({
        where: { id },
        data: validatedData
      })
      
      // Audit log within transaction
      await logAudit(
        tx,
        user.id,
        'update',
        'episode',
        updated.id,
        { title: updated.title }
      )
      
      return updated
    })
    
    return NextResponse.json(episode)
  } catch (error) {
    return handleError(error)
  }
}
