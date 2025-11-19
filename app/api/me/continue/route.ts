import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

// Cache for 30 seconds - continue reading updates frequently
export const revalidate = 30

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

    // Separate content and episode IDs
    const limitedEvents = viewEvents.slice(0, limit)
    const contentIds = limitedEvents
      .filter(e => e.entityType === 'content')
      .map(e => e.entityId)
      .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

    const episodeIds = limitedEvents
      .filter(e => e.entityType === 'episode')
      .map(e => e.entityId)
      .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates

    // Batch fetch all content and episodes in parallel
    const [contents, episodes] = await Promise.all([
      contentIds.length > 0
        ? prisma.content.findMany({
            where: { id: { in: contentIds } },
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
        : [],
      episodeIds.length > 0
        ? prisma.episode.findMany({
            where: { id: { in: episodeIds } },
            select: {
              id: true,
              title: true,
              excerpt: true,
              publishedAt: true,
              locked: true,
            }
          })
        : []
    ])

    // Create lookup maps for O(1) access
    const contentMap = new Map(contents.map(c => [c.id, c]))
    const episodeMap = new Map(episodes.map(e => [e.id, e]))

    // Build response maintaining original order from viewEvents
    const continueItems = limitedEvents
      .map(event => {
        if (event.entityType === 'content') {
          const content = contentMap.get(event.entityId)
          if (content) {
            return {
              type: 'content' as const,
              entity: content,
              lastViewed: event.createdAt,
            }
          }
        } else if (event.entityType === 'episode') {
          const episode = episodeMap.get(event.entityId)
          if (episode) {
            return {
              type: 'episode' as const,
              entity: episode,
              lastViewed: event.createdAt,
            }
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return NextResponse.json(continueItems)
  } catch (error) {
    console.error('Error fetching continue reading:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
