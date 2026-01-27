import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireActiveSubscription('api')
  try {

    // Get all channels
    const channels = await prisma.channel.findMany({
      select: { id: true },
      orderBy: { order: 'asc' }
    })

    // Get last read times for user
    const reads = await prisma.channelRead.findMany({
      where: { userId: session.id },
      select: { channelId: true, lastReadAt: true }
    })

    const readMap = new Map(reads.map(r => [r.channelId, r.lastReadAt]))

    // Get unread counts for each channel
    const unreadCounts = await Promise.all(
      channels.map(async (channel) => {
        const lastReadAt = readMap.get(channel.id)
        
        const count = await prisma.message.count({
          where: {
            channelId: channel.id,
            userId: { not: session.id }, // Don't count own messages
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          }
        })

        return {
          channelId: channel.id,
          unreadCount: count
        }
      })
    )

    return NextResponse.json({
      ok: true,
      unreadCounts: unreadCounts.reduce((acc, item) => {
        acc[item.channelId] = item.unreadCount
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Error fetching unread counts:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch unread counts' },
      { status: 500 }
    )
  }
}

