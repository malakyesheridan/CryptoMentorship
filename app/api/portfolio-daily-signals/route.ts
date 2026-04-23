import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireActiveSubscription } from '@/lib/access'

export const revalidate = 60 // Cache for 1 minute

// GET /api/portfolio-daily-signals — single-tier model. Any active subscriber
// sees both the Market Rotation (majors) and Memecoins feeds; we return the
// most recent signal per category, optionally filtered by a date.
export async function GET(request: NextRequest) {
  await requireActiveSubscription('api')
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    let dateFilter: { gte?: Date; lt?: Date } | undefined
    if (dateParam) {
      const tzOffsetParam = searchParams.get('tzOffset')
      const tzOffsetMinutes = tzOffsetParam ? Number(tzOffsetParam) : 0
      const safeOffsetMinutes = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0

      const [year, month, day] = dateParam.split('-').map(Number)
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) + safeOffsetMinutes * 60 * 1000)
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) + safeOffsetMinutes * 60 * 1000)

      dateFilter = {
        gte: startOfDay,
        lt: new Date(endOfDay.getTime() + 1),
      }
    }

    const whereClause: any = {}
    if (dateFilter) {
      whereClause.publishedAt = dateFilter
    }

    const allSignals = await prisma.portfolioDailySignal.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
    })

    // Keep the most recent signal per category. Signals with a null category
    // (historical edge cases) roll into the 'majors' feed for backward-compat.
    const signalsMap = new Map<string, typeof allSignals[0]>()
    for (const signal of allSignals) {
      const categoryKey = signal.category === 'memecoins' ? 'memecoins' : 'majors'
      if (!signalsMap.has(categoryKey)) {
        signalsMap.set(categoryKey, signal)
      }
    }

    const signals = Array.from(signalsMap.values())

    return NextResponse.json({
      signals,
      isActive: true,
    })
  } catch (error) {
    console.error('Error fetching daily updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
