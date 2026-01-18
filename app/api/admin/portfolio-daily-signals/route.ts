import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'
import { logger } from '@/lib/logger'
import { formatAllocationSignal, parseAllocationAssets, portfolioAssets } from '@/lib/portfolio-assets'
import { deriveAllocations } from '@/lib/portfolio/deriveAllocations'
import { buildPortfolioKey } from '@/lib/portfolio/portfolio-key'

export const dynamic = 'force-dynamic'

type RiskProfile = 'AGGRESSIVE' | 'SEMI' | 'CONSERVATIVE'

function deriveRiskProfileFromAssets(input: {
  primaryAsset?: string
  secondaryAsset?: string
  tertiaryAsset?: string
}): RiskProfile {
  if (input.tertiaryAsset) return 'CONSERVATIVE'
  if (input.secondaryAsset) return 'SEMI'
  if (input.primaryAsset) return 'AGGRESSIVE'
  return 'CONSERVATIVE'
}

const createDailySignalSchema = z.object({
  tier: z.enum(['T1', 'T2']),
  category: z.enum(['majors', 'memecoins']).optional(),
  signal: z.string().optional(),
  primaryAsset: z.enum(portfolioAssets).optional(),
  secondaryAsset: z.enum(portfolioAssets).optional(),
  tertiaryAsset: z.enum(portfolioAssets).optional(),
  executiveSummary: z.string().optional(),
  associatedData: z.string().optional(),
}).superRefine((data, ctx) => {
  // Category is required for T2 (Elite), optional for T1 (Growth)
  if (data.tier === 'T2') {
    if (data.category !== 'majors' && data.category !== 'memecoins') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category must be 'majors' or 'memecoins' for T2 (Elite) tier",
        path: ['category'],
      })
    }
  }

  const requiresTextSignal = data.category === 'memecoins'
  if (requiresTextSignal) {
    if (!data.signal || !data.signal.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Signal text is required for memecoins updates',
        path: ['signal'],
      })
    }
  } else {
    if (!data.primaryAsset || !data.secondaryAsset || !data.tertiaryAsset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary, secondary, and tertiary assets are required',
        path: ['primaryAsset'],
      })
    }
  }
})

function triggerPortfolioRoiRecompute(request: NextRequest, portfolioKey: string) {
  const origin = request.nextUrl.origin
  const url = new URL('/api/cron/portfolio-roi', origin)
  if (process.env.VERCEL_CRON_SECRET) {
    url.searchParams.set('secret', process.env.VERCEL_CRON_SECRET)
  }
  url.searchParams.set('portfolioKey', portfolioKey)

  void fetch(url.toString(), { method: 'POST' })
    .catch((error) => {
      logger.warn('Failed to trigger portfolio ROI recompute', {
        portfolioKey,
        error: error instanceof Error ? error.message : String(error)
      })
    })
}

// GET /api/admin/portfolio-daily-signals - Get all daily updates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (tier) {
      where.tier = tier
    }

    const signals = await prisma.portfolioDailySignal.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ signals })
  } catch (error) {
    console.error('Error fetching daily updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/portfolio-daily-signals - Create new daily update (replaces existing for today)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createDailySignalSchema.parse(body)

    // Delete any existing update for this tier/category for today only (keep history)
    let whereClause: any
    const now = new Date()
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
    const todayFilter = {
      gte: startOfTodayUtc,
      lt: new Date(endOfTodayUtc.getTime() + 1)
    }
    
    if (data.tier === 'T2' && data.category) {
      // For T2 (Elite), filter by tier and category
      whereClause = {
        tier: data.tier,
        category: data.category,
        publishedAt: todayFilter
      }
    } else if (data.tier === 'T1') {
      // For T1 (Growth), find signals with tier T1 OR old T2 signals without category
      // This handles both new T1 signals and old T2 signals that map to T1
      whereClause = {
        OR: [
          { tier: 'T1', category: null },
          { tier: 'T2', category: null }
        ],
        publishedAt: todayFilter
      }
    } else {
      // Fallback (shouldn't happen with current schema)
      whereClause = {
        tier: data.tier,
        publishedAt: todayFilter
      }
    }

    // Delete any updates for this tier/category for today only
    await prisma.portfolioDailySignal.deleteMany({
      where: whereClause,
    })

  // Create new update
  // For T1 (Growth), ensure category is explicitly null (not undefined)
  const signalValue = data.category === 'memecoins'
    ? data.signal!.trim()
    : formatAllocationSignal(data.primaryAsset!, data.secondaryAsset!, data.tertiaryAsset!)
  const riskProfile = data.category === 'memecoins'
    ? 'CONSERVATIVE'
    : deriveRiskProfileFromAssets(data)

  const createData: any = {
    tier: data.tier,
    riskProfile,
    signal: signalValue,
      executiveSummary: data.executiveSummary || null,
      associatedData: data.associatedData || null,
      createdById: session.user.id
    }
    
    // Only include category for T2 (Elite)
    if (data.tier === 'T2' && data.category) {
      createData.category = data.category
    } else {
      // For T1 (Growth), explicitly set category to null
      createData.category = null
    }
    
    const signal = await prisma.portfolioDailySignal.create({
      data: createData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    const portfolioKey = buildPortfolioKey({
      tier: signal.tier,
      category: signal.category,
      riskProfile: signal.riskProfile
    })
    const publishedAt = signal.publishedAt
    const asOfDate = new Date(Date.UTC(
      publishedAt.getUTCFullYear(),
      publishedAt.getUTCMonth(),
      publishedAt.getUTCDate()
    ))

    const allocationAssets = parseAllocationAssets(signal.signal)
    if (allocationAssets) {
      try {
        const allocations = deriveAllocations(signal.riskProfile, {
          primary: allocationAssets.primaryAsset,
          secondary: allocationAssets.secondaryAsset,
          tertiary: allocationAssets.tertiaryAsset
        })

        await prisma.allocationSnapshot.upsert({
          where: {
            portfolioKey_asOfDate: {
              portfolioKey,
              asOfDate
            }
          },
          update: {
            items: allocations.map((allocation) => ({
              asset: allocation.symbol,
              weight: allocation.weight
            })),
            cashWeight: 0,
            updatedByUserId: session.user.id
          },
          create: {
            portfolioKey,
            asOfDate,
            items: allocations.map((allocation) => ({
              asset: allocation.symbol,
              weight: allocation.weight
            })),
            cashWeight: 0,
            updatedByUserId: session.user.id
          }
        })

        const recomputeFromDate = new Date(asOfDate)
        recomputeFromDate.setUTCDate(recomputeFromDate.getUTCDate() - 2)

        const existingSnapshot = await prisma.roiDashboardSnapshot.findUnique({
          where: {
            scope_portfolioKey: {
              scope: 'PORTFOLIO',
              portfolioKey
            }
          }
        })

        const nextRecomputeFromDate = existingSnapshot?.recomputeFromDate
          ? (existingSnapshot.recomputeFromDate < recomputeFromDate ? existingSnapshot.recomputeFromDate : recomputeFromDate)
          : recomputeFromDate

        await prisma.roiDashboardSnapshot.upsert({
          where: {
            scope_portfolioKey: {
              scope: 'PORTFOLIO',
              portfolioKey
            }
          },
          update: {
            needsRecompute: true,
            recomputeFromDate: nextRecomputeFromDate,
            updatedByUserId: session.user.id
          },
          create: {
            scope: 'PORTFOLIO',
            portfolioKey,
            cacheKey: portfolioKey,
            payload: '{}',
            needsRecompute: true,
            recomputeFromDate: nextRecomputeFromDate,
            updatedByUserId: session.user.id
          }
        })

        triggerPortfolioRoiRecompute(request, portfolioKey)
      } catch (error) {
        logger.error('Failed to derive allocations for update', error instanceof Error ? error : new Error(String(error)), {
          signalId: signal.id,
          tier: signal.tier,
          category: signal.category
        })
      }
    } else {
      logger.warn('Allocation assets missing for update; skipping model recompute mark', {
        signalId: signal.id,
        tier: signal.tier,
        category: signal.category
      })
    }

    try {
      await sendSignalEmails(signal.id)
      logger.info('Email sending completed successfully', {
        signalId: signal.id,
        tier: signal.tier,
      })
    } catch (error) {
      logger.error('Failed to send update emails', error instanceof Error ? error : new Error(String(error)), {
        signalId: signal.id,
        tier: signal.tier,
      })
      console.error('[POST] Failed to send update emails:', error)
    }

    return NextResponse.json(signal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues.map(issue => ({
          path: issue.path,
          message: issue.message
        }))
      }, { status: 400 })
    }
    console.error('Error creating daily update:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
}

