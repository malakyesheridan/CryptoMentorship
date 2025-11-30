import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const revalidate = 60 // Cache for 1 minute

// GET /api/portfolio-daily-signals - Get all daily updates (with user tier for access control)
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
    // Trial accounts should be treated as active for update access
    const isActive = (membership?.status === 'active' || membership?.status === 'trial') || session.user.role === 'admin'

    // Get the most recent update for each tier/category combination
    // This ensures updates remain visible until they are updated
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
      // Map old tiers to new tiers for display
      let displayTier = signal.tier
      if (signal.tier === 'T2' && !signal.category) {
        // Old T2 (no category) → new T1 (Growth)
        displayTier = 'T1'
      } else if (signal.tier === 'T3') {
        // Old T3 → new T2 (Elite)
        displayTier = 'T2'
      } else if (signal.tier === 'T1') {
        // T1 is now Growth tier - keep as T1 (no longer skipping)
        displayTier = 'T1'
      }
      
      // Create a unique key: tier + category (or just tier for T1)
      const key = displayTier === 'T2' && signal.category 
        ? `${displayTier}-${signal.category}` 
        : displayTier
      
      // Only keep the first (most recent) update for each key
      if (!signalsMap.has(key)) {
        // Create a new signal object with mapped tier
        const mappedSignal = { ...signal, tier: displayTier }
        signalsMap.set(key, mappedSignal)
      }
    }

    // Convert map back to array and sort by tier
    const signals = Array.from(signalsMap.values()).sort((a, b) => {
      const tierOrder = { 'T1': 1, 'T2': 2 }
      return (tierOrder[a.tier as keyof typeof tierOrder] || 99) - (tierOrder[b.tier as keyof typeof tierOrder] || 99)
    })

    return NextResponse.json({ 
      signals,
      userTier,
      isActive 
    })
  } catch (error) {
    console.error('Error fetching daily updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

