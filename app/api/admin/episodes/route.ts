import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const episodeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  excerpt: z.string().optional(),
  videoUrl: z.string().url('Valid video URL is required'),
  body: z.string().optional(),
  coverUrl: z.string().optional(),
  category: z.enum(['daily-update', 'analysis', 'breakdown']).default('daily-update'),
  locked: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const body = await request.json()
    const validatedData = episodeSchema.parse(body)
    
    // Check if slug is unique
    const existingEpisode = await prisma.episode.findUnique({
      where: { slug: validatedData.slug }
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
          ...validatedData,
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
    const validatedData = episodeSchema.partial().parse(updateData)
    
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
