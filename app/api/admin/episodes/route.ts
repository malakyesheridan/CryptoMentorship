import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'
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
    
    // Expect JSON with videoUrl (uploaded via blob storage)
    const body = await request.json()
    const title = body.title
    const description = body.description || ''
    const slug = body.slug
    const videoUrl = body.videoUrl
    const duration = body.duration ? parseInt(body.duration) : null

    console.log('[Episode Creation] Request received:', {
      title: title?.substring(0, 50),
      slug: slug?.substring(0, 50),
      videoUrl: videoUrl ? 'present' : 'missing',
      userId: user.id
    })

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

    if (!videoUrl || !videoUrl.trim()) {
      return NextResponse.json(
        { error: 'Video URL is required. Please upload the video first.' },
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
      console.log('[Episode Creation] Starting transaction...')
      
      const created = await tx.episode.create({
        data: {
          title: title.trim(),
          slug: slug.trim(),
          excerpt: description?.trim() || null,
          videoUrl: videoUrl.trim(),
          body: null,
          coverUrl: null,
          duration: duration,
          category: 'daily-update',
          locked: false, // Always false - everyone can view
          publishedAt: new Date(),
        }
      })
      
      console.log('[Episode Creation] Episode created successfully:', created.id)
      
      // Audit log within transaction (non-blocking - won't fail transaction if audit fails)
      try {
        await logAudit(
          tx,
          user.id,
          'create',
          'episode',
          created.id,
          { title: created.title }
        )
        console.log('[Episode Creation] Audit log created successfully')
      } catch (auditError) {
        // Log but don't fail the transaction
        console.error('[Episode Creation] Audit logging failed (non-blocking):', auditError)
      }
      
      return created
    })
    
    console.log('[Episode Creation] Transaction completed successfully')
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

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    const body = await request.json().catch(() => ({}))
    const id = body?.id as string | undefined

    if (!id) {
      return NextResponse.json(
        { error: 'Episode ID is required' },
        { status: 400 }
      )
    }

    const existingEpisode = await prisma.episode.findUnique({
      where: { id }
    })

    if (!existingEpisode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    const deletedEpisode = await prisma.$transaction(async (tx) => {
      await tx.bookmark.deleteMany({
        where: { episodeId: id }
      })

      await tx.viewEvent.deleteMany({
        where: { entityType: 'episode', entityId: id }
      })

      await tx.notification.deleteMany({
        where: { entityType: 'episode', entityId: id }
      })

      const deleted = await tx.episode.delete({
        where: { id }
      })

      await logAudit(
        tx,
        user.id,
        'delete',
        'episode',
        deleted.id,
        { title: deleted.title }
      )

      return deleted
    })

    const deleteBlobIfNeeded = async (url?: string | null) => {
      if (!url) return
      try {
        const parsed = new URL(url)
        if (!parsed.hostname.endsWith('.public.blob.vercel-storage.com')) {
          return
        }
        const token = process.env.BLOB_READ_WRITE_TOKEN
        if (!token) return
        const { del } = await import('@vercel/blob')
        await del(url, { token })
      } catch {
        // Ignore cleanup errors
      }
    }

    await Promise.all([
      deleteBlobIfNeeded(existingEpisode.videoUrl),
      deleteBlobIfNeeded(existingEpisode.coverUrl)
    ])

    return NextResponse.json({ success: true, id: deletedEpisode.id })
  } catch (error) {
    return handleError(error)
  }
}
