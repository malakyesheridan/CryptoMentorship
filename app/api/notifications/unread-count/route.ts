import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

// Revalidate every 30 seconds - notifications need to be relatively fresh
export const revalidate = 30

// Cache unread count per user for 30 seconds
async function getUnreadCountCached(userId: string) {
  return unstable_cache(
    async () => {
      return await prisma.notification.count({
        where: {
          userId,
          readAt: null
        }
      })
    },
    [`unread-count-${userId}`],
    { revalidate: 30 }
  )()
}

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 }) // Return 0 instead of error for unauthenticated users
    }

    const count = await getUnreadCountCached(session.user.id)

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    // Return 0 instead of error to prevent UI crashes
    return NextResponse.json({ count: 0 })
  }
}
