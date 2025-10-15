import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { generateSlug } from '@/lib/content'
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
    
    const content = await prisma.content.create({
      data: {
        ...validatedData,
        tags: JSON.stringify(validatedData.tags),
        publishedAt: new Date(),
      }
    })
    
    await logAudit(
      user.id,
      'create',
      'content',
      content.id,
      { title: content.title, kind: content.kind }
    )
    
    return NextResponse.json(content)
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    )
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
    
    const content = await prisma.content.update({
      where: { id },
      data: {
        ...validatedData,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : undefined
      }
    })
    
    await logAudit(
      user.id,
      'update',
      'content',
      content.id,
      { title: content.title, kind: content.kind }
    )
    
    return NextResponse.json(content)
  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    )
  }
}
