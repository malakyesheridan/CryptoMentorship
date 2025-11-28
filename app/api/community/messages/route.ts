import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { broadcastMessage } from '@/lib/community/sse'
import { sanitizeHtml } from '@/lib/sanitize'

// Revalidate GET requests every 10 seconds - messages are real-time but we want some caching
// Note: POST requests are not cached (they're write operations)

const getQuery = z.object({
  channelId: z.string().min(1),
  take: z.coerce.number().int().positive().max(200).optional(),
})

const postBody = z.object({
  channelId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
})

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const parsed = getQuery.safeParse({
      channelId: url.searchParams.get('channelId'),
      take: url.searchParams.get('take') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: 'BAD_QUERY', message: 'Invalid query', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { channelId, take = 50 } = parsed.data // Reduced default from 100 to 50

    // Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true },
    })

    if (!channel) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Channel not found' },
        { status: 404 },
      )
    }

    // Fetch messages in reverse chronological order (newest first) then reverse
    // This is faster with the index on [channelId, createdAt(sort: Desc)]
    const rows = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' }, // Use desc to leverage index
      take: Math.min(take, 100), // Cap at 100 for safety
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    // Reverse to get chronological order (oldest first)
    rows.reverse()

    const items = rows.map((message) => ({
      id: message.id,
      channelId: message.channelId,
      userId: message.userId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      author: {
        id: message.user.id,
        name: message.user.name,
        image: message.user.image,
      },
    }))

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to fetch messages' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = postBody.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_BODY', message: 'Invalid payload' },
      { status: 400 },
    )
  }

  const { channelId, body: text } = parsed.data

  // ✅ Require authentication first (before any DB queries)
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTH', message: 'Authentication required' },
      { status: 401 },
    )
  }

  // Sanitize HTML first (before DB operations)
  const sanitizedBody = sanitizeHtml(text)

  // Create message - use session data directly (no need to query user again)
  const saved = await prisma.message.create({
    data: {
      channelId,
      userId: session.user.id,
      body: sanitizedBody,
    },
    select: {
      id: true,
      channelId: true,
      userId: true,
      body: true,
      createdAt: true,
    },
  })

  // Use session data directly - eliminates unnecessary database query
  const item = {
    id: saved.id,
    channelId: saved.channelId,
    userId: saved.userId,
    body: saved.body,
    createdAt: saved.createdAt.toISOString(),
    author: {
      id: session.user.id,
      name: session.user.name ?? 'Anonymous',
      image: session.user.image ?? null,
    },
  }

  // Broadcast the new message asynchronously (don't block response)
  // This makes message creation feel instant
  // Use process.nextTick for Node.js or setTimeout for browser compatibility
  if (typeof process !== 'undefined' && process.nextTick) {
    process.nextTick(() => {
      broadcastMessage(channelId, {
        message: item,
        channelId,
        userId: session.user.id,
      })
    })
  } else {
    // Fallback for environments without process.nextTick
    setTimeout(() => {
      broadcastMessage(channelId, {
        message: item,
        channelId,
        userId: session.user.id,
      })
    }, 0)
  }

  return NextResponse.json({ ok: true, item })
}

