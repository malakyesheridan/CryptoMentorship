import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { generateSlug } from '@/lib/content'
import { handleError } from '@/lib/errors'
import { emit } from '@/lib/events'
import { z } from 'zod'

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  kind: z.enum(['research', 'signal', 'resource']),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  coverUrl: z.string().optional(),
  locked: z.boolean().default(false),
  minTier: z.enum(['T1', 'T2', 'T3']).optional(),
  tags: z.array(z.string()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const body = await request.json()
    const validatedData = contentSchema.parse(body)
    
    // Check if slug is unique
    const existingContent = await prisma.content.findUnique({
      where: { slug: validatedData.slug }
    })
    
    if (existingContent) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }
    
    // Wrap in transaction for atomicity
    const content = await prisma.$transaction(async (tx) => {
      const created = await tx.content.create({
        data: {
          ...validatedData,
          tags: JSON.stringify(validatedData.tags),
          publishedAt: new Date(),
        }
      })
      
      // Audit log within transaction
      await logAudit(
        tx,
        user.id,
        'create',
        'content',
        created.id,
        { title: created.title, kind: created.kind }
      )
      
      return created
    })
    
    // Emit notification event for published content
    if (content.publishedAt) {
      const eventType = content.kind === 'research' ? 'research_published' : 
                        content.kind === 'signal' ? 'signal_published' : null
      
      if (eventType) {
        // Fire and forget - don't wait for notification creation
        emit({ type: eventType, contentId: content.id }).catch(err => {
          console.error('Failed to emit notification event:', err)
        })
      }
    }
    
    return NextResponse.json(content)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(['admin', 'editor'])
    
    const body = await request.json()
    const { id, ...updateData } = body
    const validatedData = contentSchema.partial().parse(updateData)
    
    if (!id) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }
    
    // Check if content exists
    const existingContent = await prisma.content.findUnique({
      where: { id }
    })
    
    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }
    
    // Check slug uniqueness if slug is being updated
    if (validatedData.slug && validatedData.slug !== existingContent.slug) {
      const slugExists = await prisma.content.findUnique({
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
    const content = await prisma.$transaction(async (tx) => {
      const updated = await tx.content.update({
        where: { id },
        data: {
          ...validatedData,
          tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined
        }
      })
      
      // Audit log within transaction
      await logAudit(
        tx,
        user.id,
        'update',
        'content',
        updated.id,
        { title: updated.title, kind: updated.kind }
      )
      
      return updated
    })
    
    // Emit notification event if content was just published (wasn't published before, now is)
    const wasJustPublished = !existingContent.publishedAt && content.publishedAt
    if (wasJustPublished) {
      const eventType = content.kind === 'research' ? 'research_published' : 
                        content.kind === 'signal' ? 'signal_published' : null
      
      if (eventType) {
        // Fire and forget - don't wait for notification creation
        emit({ type: eventType, contentId: content.id }).catch(err => {
          console.error('Failed to emit notification event:', err)
        })
      }
    }
    
    return NextResponse.json(content)
  } catch (error) {
    return handleError(error)
  }
}
