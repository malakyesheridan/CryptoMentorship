import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'

const postBody = z.object({
  name: z.string().trim().min(1, 'Channel name is required').max(100, 'Channel name must be 100 characters or less'),
  description: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().trim().max(500, 'Description must be 500 characters or less').optional()
  ),
})

export async function GET() {
  await requireActiveSubscription('api')
  try {
    // ✅ Return all channels - ordered by order field, then name
    const rows = await prisma.channel.findMany({
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        order: true,
        createdAt: true,
      },
    })

    const items = rows.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      order: channel.order,
      createdAt: channel.createdAt.toISOString(),
    }))

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const userSession = await requireActiveSubscription('api')

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { id: userSession.id },
    select: { role: true },
  })

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Admin privileges required' },
      { status: 403 },
    )
  }

  let body
  try {
    body = await req.json()
    console.log('POST request body:', body)
  } catch (error) {
    console.error('JSON parse error:', error)
    return NextResponse.json(
      { ok: false, code: 'BAD_BODY', message: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  const parsed = postBody.safeParse(body)

  if (!parsed.success) {
    console.error('POST Validation error:', JSON.stringify(parsed.error.issues, null, 2))
    console.error('POST Received body:', JSON.stringify(body, null, 2))
    console.error('POST Body type:', typeof body)
    console.error('POST Body keys:', Object.keys(body || {}))
    
    const errorMessages = parsed.error.issues.map((err: any) => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ')
    
    return NextResponse.json(
      { 
        ok: false, 
        code: 'BAD_BODY', 
        message: `Validation failed: ${errorMessages}`,
        errors: parsed.error.issues 
      },
      { status: 400 },
    )
  }

  const { name, description } = parsed.data

  // ✅ Allow any channel name when creating - removed restriction
  // Channel names can now be any valid string (1-100 characters)

  // Generate slug from name
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  // Ensure slug is not empty
  if (!slug) {
    slug = 'channel-' + Date.now().toString(36)
  }
  
  // Check if slug already exists
  const existingChannel = await prisma.channel.findUnique({
    where: { slug },
    select: { id: true }
  })
  
  // If slug exists, append timestamp to make it unique
  if (existingChannel) {
    slug = slug + '-' + Date.now().toString(36)
  }

  try {
    // Get max order value to set new channel order
    const maxOrderChannel = await prisma.channel.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const newOrder = (maxOrderChannel?.order ?? -1) + 1

    const channel = await prisma.channel.create({
      data: {
        slug,
        name,
        description,
        order: newOrder,
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

const updateBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
})

// PUT /api/community/channels/[channelId] - Update channel (admin only)
export async function PUT(req: Request) {
  const userSession = await requireActiveSubscription('api')

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { id: userSession.id },
    select: { role: true },
  })

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Admin privileges required' },
      { status: 403 },
    )
  }

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  
  if (!channelId) {
    return NextResponse.json(
      { ok: false, code: 'BAD_QUERY', message: 'channelId is required' },
      { status: 400 },
    )
  }

  let body
  try {
    body = await req.json()
    console.log('PUT request body:', body)
  } catch (error) {
    console.error('JSON parse error:', error)
    return NextResponse.json(
      { ok: false, code: 'BAD_BODY', message: 'Invalid JSON in request body' },
      { status: 400 },
    )
  }

  const parsed = updateBody.safeParse(body)

  if (!parsed.success) {
    console.error('Validation error:', parsed.error.issues)
    console.error('Received body:', body)
    return NextResponse.json(
      { 
        ok: false, 
        code: 'BAD_BODY', 
        message: 'Invalid payload',
        errors: parsed.error.issues 
      },
      { status: 400 },
    )
  }

  const { name, description } = parsed.data

  // ✅ Allow any channel name when updating - removed restriction
  // Channel names can now be changed to any valid string (1-100 characters)

  try {
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    if (name) {
      // Generate slug from name if name is being updated
      let slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      // Ensure slug is not empty
      if (!slug) {
        slug = 'channel-' + channelId.slice(-6)
      }
      
      // Check if slug already exists for a different channel
      const existingChannel = await prisma.channel.findUnique({
        where: { slug },
        select: { id: true }
      })
      
      // If slug exists for a different channel, append channel ID to make it unique
      if (existingChannel && existingChannel.id !== channelId) {
        slug = slug + '-' + channelId.slice(-6)
      }
      
      updateData.slug = slug
    }

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: updateData,
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
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Channel not found' },
        { status: 404 },
      )
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { ok: false, code: 'DUPLICATE', message: 'Channel with this name already exists' },
        { status: 409 },
      )
    }

    console.error('Error updating channel:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to update channel' },
      { status: 500 },
    )
  }
}

// DELETE /api/community/channels/[channelId] - Delete channel (admin only)
export async function DELETE(req: Request) {
  const userSession = await requireActiveSubscription('api')

  // Check if user has admin privileges
  const user = await prisma.user.findUnique({
    where: { id: userSession.id },
    select: { role: true },
  })

  if (!user || !['admin', 'editor'].includes(user.role)) {
    return NextResponse.json(
      { ok: false, code: 'FORBIDDEN', message: 'Admin privileges required' },
      { status: 403 },
    )
  }

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')
  
  if (!channelId) {
    return NextResponse.json(
      { ok: false, code: 'BAD_QUERY', message: 'channelId is required' },
      { status: 400 },
    )
  }

  try {
    await prisma.channel.delete({
      where: { id: channelId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Channel not found' },
        { status: 404 },
      )
    }

    console.error('Error deleting channel:', error)
    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: 'Failed to delete channel' },
      { status: 500 },
    )
  }
}

