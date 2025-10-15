import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const episodeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  excerpt: z.string().optional(),
  videoUrl: z.string().url('Valid video URL is required'),
  body: z.string().optional(),
  coverUrl: z.string().optional(),
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
    
    const episode = await prisma.episode.create({
      data: {
        ...validatedData,
        publishedAt: new Date(),
      }
    })
    
    await logAudit(
      user.id,
      'create',
      'episode',
      episode.id,
      { title: episode.title }
    )
    
    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error creating episode:', error)
    return NextResponse.json(
      { error: 'Failed to create episode' },
      { status: 500 }
    )
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
    
    const episode = await prisma.episode.update({
      where: { id },
      data: validatedData
    })
    
    await logAudit(
      user.id,
      'update',
      'episode',
      episode.id,
      { title: episode.title }
    )
    
    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error updating episode:', error)
    return NextResponse.json(
      { error: 'Failed to update episode' },
      { status: 500 }
    )
  }
}
