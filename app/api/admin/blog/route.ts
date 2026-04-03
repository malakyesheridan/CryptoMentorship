import { NextRequest, NextResponse } from 'next/server'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { handleError } from '@/lib/errors'
import { z } from 'zod'

const CreateBlogSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional(),
  body: z.string().min(1, 'Body is required'),
  htmlBody: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  category: z.enum([
    'market-update',
    'system-spotlight',
    'industry-analysis',
    'webinar-recap',
    'guide',
  ]),
  tags: z.array(z.string()).default([]),
  featuredImage: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']).default('draft'),
  platformOnly: z.boolean().default(false),
})

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function calculateReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export async function GET(request: NextRequest) {
  try {
    await requireRoleAPI(['admin', 'editor'])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: any = {}
    if (status) where.status = status
    if (category) where.category = category

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          status: true,
          readingTime: true,
          platformOnly: true,
          publishedAt: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.blogPost.count({ where }),
    ])

    return NextResponse.json({ posts, total, page, limit })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRoleAPI(['admin', 'editor'])

    const body = await request.json()
    const data = CreateBlogSchema.parse(body)

    // Generate slug from title
    let slug = generateSlug(data.title)

    // Ensure slug uniqueness
    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const readingTime = calculateReadingTime(data.body)
    const publishedAt = data.status === 'published' ? new Date() : null

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.blogPost.create({
        data: {
          title: data.title,
          subtitle: data.subtitle,
          slug,
          body: data.body,
          htmlBody: data.htmlBody || null,
          excerpt: data.excerpt || null,
          category: data.category,
          tags: data.tags,
          featuredImage: data.featuredImage || null,
          status: data.status,
          platformOnly: data.platformOnly,
          readingTime,
          publishedAt,
          authorId: user.id,
        },
      })

      await logAudit(tx, user.id, 'create', 'blog_post', created.id, {
        title: created.title,
        status: created.status,
      })

      return created
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
