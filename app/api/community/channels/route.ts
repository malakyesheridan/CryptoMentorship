import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

const postBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
})

export async function GET() {
  try {
    console.log('GET /api/community/channels called')
    
    const rows = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    console.log('Found channels:', rows.length)

    const items = rows.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      createdAt: channel.createdAt.toISOString(),
    }))

    console.log('Returning items:', items.length)
    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error('Error fetching channels:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTH', message: 'Sign in required' },
      { status: 401 },
    )
  }

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  })

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Admin privileges required' },
      { status: 403 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = postBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_BODY', message: 'Invalid payload' },
      { status: 400 },
    )
  }

  const { name, description } = parsed.data

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  try {
    const channel = await prisma.channel.create({
      data: {
        slug,
        name,
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      item: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        createdAt: channel.createdAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { ok: false, code: 'DUPLICATE', message: 'Channel with this name already exists' },
        { status: 409 },
      )
    }

    console.error('Error creating channel:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to create channel' },
      { status: 500 },
    )
  }
}

