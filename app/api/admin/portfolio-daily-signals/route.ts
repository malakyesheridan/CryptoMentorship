import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'
import { runPortfolioRoiJob } from '@/lib/jobs/portfolio-roi'
import { logger } from '@/lib/logger'
import { formatAllocationSignal, parseAllocationAssets, portfolioAssets } from '@/lib/portfolio-assets'
import { revalidateDashboardSignals } from '@/lib/revalidate'
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
  // Single-tier model — the `tier` field is retained in the DB for historical
  // continuity but server-side always written as 'T2'. Still accepted in the
  // request for backward-compat with older clients.
  tier: z.enum(['T1', 'T2']).optional(),
  category: z.enum(['majors', 'memecoins']),
  signal: z.string().optional(),
  primaryAsset: z.enum(portfolioAssets).optional(),
  secondaryAsset: z.enum(portfolioAssets).optional(),
  tertiaryAsset: z.enum(portfolioAssets).optional(),
  executiveSummary: z.string().optional(),
  associatedData: z.string().optional(),
}).superRefine((data, ctx) => {
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

function scheduleImmediatePortfolioRoiRecompute(portfolioKey: string, userId?: string) {
  void runPortfolioRoiJob({
    portfolioKey,
    includeClean: true,
    trigger: 'publish',
    requestedBy: userId
  }).catch((error) => {
    logger.error(
      'Immediate portfolio ROI recompute failed',
      error instanceof Error ? error : new Error(String(error)),
      { portfolioKey }
    )
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

    // Delete any existing update for this category today (keeps history on prior days)
    const now = new Date()
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const endOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
    const todayFilter = {
      gte: startOfTodayUtc,
      lt: new Date(endOfTodayUtc.getTime() + 1)
    }

    await prisma.portfolioDailySignal.deleteMany({
      where: {
        category: data.category,
        publishedAt: todayFilter,
      },
    })

    const signalValue = data.category === 'memecoins'
      ? data.signal!.trim()
      : formatAllocationSignal(data.primaryAsset!, data.secondaryAsset!, data.tertiaryAsset!)
    const riskProfile = data.category === 'memecoins'
      ? 'CONSERVATIVE'
      : deriveRiskProfileFromAssets(data)

    const createData: any = {
      // Single-tier model — always tag new signals as 'T2' for schema continuity.
      tier: 'T2',
      category: data.category,
      riskProfile,
      signal: signalValue,
      executiveSummary: data.executiveSummary || null,
      associatedData: data.associatedData || null,
      createdById: session.user.id,
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
        scheduleImmediatePortfolioRoiRecompute(portfolioKey, session.user.id)
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

    await sendSignalEmails(signal.id).catch((error) => {
      logger.error('Failed to send signal emails', error instanceof Error ? error : new Error(String(error)), {
        signalId: signal.id,
      })
    })

    await revalidateDashboardSignals()

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

