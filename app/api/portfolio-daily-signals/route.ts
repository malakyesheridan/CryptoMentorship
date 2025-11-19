import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const revalidate = 60 // Cache for 1 minute

// GET /api/portfolio-daily-signals - Get all daily signals (with user tier for access control)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tier
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { tier: true, status: true }
    })

    const userTier = membership?.tier || null
    const isActive = membership?.status === 'active' || session.user.role === 'admin'

    // Get today's signals for ALL tiers (we'll filter by access on the client)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const signals = await prisma.portfolioDailySignal.findMany({
      where: {
        publishedAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { tier: 'asc' }, // T1 first, then T2, then T3
    })

    return NextResponse.json({ 
      signals,
      userTier,
      isActive 
    })
  } catch (error) {
    console.error('Error fetching daily signals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

