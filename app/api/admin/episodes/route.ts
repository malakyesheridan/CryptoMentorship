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
    
    // Handle FormData for file upload
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const slug = formData.get('slug') as string

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

    if (!slug || !slug.trim()) {
      return NextResponse.json(
        { error: 'Slug is required' },
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
    
    const videoUrl = `/uploads/episodes/${filename}`
    
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
