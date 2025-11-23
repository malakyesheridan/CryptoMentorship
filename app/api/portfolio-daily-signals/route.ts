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

    // Get the most recent signal for each tier/category combination
    // This ensures signals remain visible until they are updated
    const allSignals = await prisma.portfolioDailySignal.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { publishedAt: 'desc' }, // Most recent first
    })

    // Group by tier and category, keeping only the most recent for each combination
    const signalsMap = new Map<string, typeof allSignals[0]>()
    
    for (const signal of allSignals) {
      // Create a unique key: tier + category (or just tier for T1/T2)
      const key = signal.tier === 'T3' && signal.category 
        ? `${signal.tier}-${signal.category}` 
        : signal.tier
      
      // Only keep the first (most recent) signal for each key
      if (!signalsMap.has(key)) {
        signalsMap.set(key, signal)
      }
    }

    // Convert map back to array and sort by tier
    const signals = Array.from(signalsMap.values()).sort((a, b) => {
      const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 }
      return (tierOrder[a.tier as keyof typeof tierOrder] || 99) - (tierOrder[b.tier as keyof typeof tierOrder] || 99)
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

