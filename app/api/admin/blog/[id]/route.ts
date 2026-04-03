import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const UpdateBlogSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).optional().nullable(),
  body: z.string().min(1).optional(),
  htmlBody: z.string().optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  category: z
    .enum([
      'market-update',
      'system-spotlight',
      'industry-analysis',
      'webinar-recap',
      'guide',
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  platformOnly: z.boolean().optional(),
})

function calculateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleAPI(['admin', 'editor'])

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireRoleAPI(['admin', 'editor'])

    const existing = await prisma.blogPost.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = UpdateBlogSchema.parse(body)

    // Recalculate reading time if body changed
    const readingTime = data.body
      ? calculateReadingTime(data.body)
      : undefined

    // Set publishedAt when transitioning to published
    let publishedAt = undefined as Date | undefined
    if (data.status === 'published' && existing.status !== 'published') {
      publishedAt = new Date()
    }

    const post = await prisma.$transaction(async (tx) => {
      const updated = await tx.blogPost.update({
        where: { id: params.id },
        data: {
          ...data,
          featuredImage: data.featuredImage === '' ? null : data.featuredImage,
          readingTime,
          ...(publishedAt && { publishedAt }),
        },
      })

      await logAudit(tx, user.id, 'update', 'blog_post', updated.id, {
        title: updated.title,
        status: updated.status,
      })

      return updated
    })

    return NextResponse.json(post)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireRoleAPI(['admin', 'editor'])

    const existing = await prisma.blogPost.findUnique({
      where: { id: params.id },
      select: { id: true, title: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.blogPost.delete({ where: { id: params.id } })

      await logAudit(tx, user.id, 'delete', 'blog_post', existing.id, {
        title: existing.title,
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
