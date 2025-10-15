import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 }) // Return 0 instead of error for unauthenticated users
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        readAt: null
      }
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    // Return 0 instead of error to prevent UI crashes
    return NextResponse.json({ count: 0 })
  }
}
