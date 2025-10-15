import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/me/continue - Get user's continue reading items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '6')

    // Get recent view events for the user
    const viewEvents = await prisma.viewEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Get more to account for duplicates
      distinct: ['entityType', 'entityId'], // Remove duplicates
    })

    // Fetch the actual content/episodes for these view events
    const continueItems = []
    
    for (const event of viewEvents.slice(0, limit)) {
      if (event.entityType === 'content') {
        const content = await prisma.content.findUnique({
          where: { id: event.entityId },
          select: {
            id: true,
            title: true,
            excerpt: true,
            kind: true,
            publishedAt: true,
            locked: true,
            tags: true,
          }
        })
        if (content) {
          continueItems.push({
            type: 'content',
            entity: content,
            lastViewed: event.createdAt,
          })
        }
      } else if (event.entityType === 'episode') {
        const episode = await prisma.episode.findUnique({
          where: { id: event.entityId },
          select: {
            id: true,
            title: true,
            excerpt: true,
            publishedAt: true,
            locked: true,
          }
        })
        if (episode) {
          continueItems.push({
            type: 'episode',
            entity: episode,
            lastViewed: event.createdAt,
          })
        }
      }
    }

    return NextResponse.json(continueItems)
  } catch (error) {
    console.error('Error fetching continue reading:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
