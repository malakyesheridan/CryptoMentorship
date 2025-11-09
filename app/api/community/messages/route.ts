import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { broadcastMessage } from '@/lib/community/sse'
import { sanitizeHtml } from '@/lib/sanitize'

const getQuery = z.object({
  channelId: z.string().min(1),
  take: z.coerce.number().int().positive().max(200).optional(),
})

const postBody = z.object({
  channelId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = getQuery.safeParse({
    channelId: url.searchParams.get('channelId'),
    take: url.searchParams.get('take') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_QUERY', message: 'Invalid query' },
      { status: 400 },
    )
  }

  const { channelId, take = 100 } = parsed.data

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true },
  })

  if (!channel) {
    return NextResponse.json(
      { ok: false, code: 'NO_CHANNEL', message: 'Channel not found' },
      { status: 404 },
    )
  }

  const rows = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: 'asc' },
    take,
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

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

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true },
  })

  if (!channel) {
    return NextResponse.json(
      { ok: false, code: 'NO_CHANNEL', message: 'Channel not found' },
      { status: 404 },
    )
  }

  // ✅ Require authentication
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTH', message: 'Authentication required' },
      { status: 401 },
    )
  }

  const saved = await prisma.message.create({
    data: {
      channelId,
      userId: session.user.id, // ✅ Use authenticated user
      body: sanitizeHtml(text), // ✅ Sanitize before storage
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  const item = {
    id: saved.id,
    channelId: saved.channelId,
    userId: saved.userId,
    body: saved.body,
    createdAt: saved.createdAt.toISOString(),
    author: {
      id: saved.user.id,
      name: saved.user.name,
      image: saved.user.image,
    },
  }

  // Broadcast the new message to all connected clients
  broadcastMessage(channelId, {
    message: item,
    channelId,
    userId: session.user.id // ✅ Use authenticated user
  })

  return NextResponse.json({ ok: true, item })
}

