import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'
import { formatAllocationSignal, parseAllocationAssets, portfolioAssets } from '@/lib/portfolio-assets'
import { deriveAllocations } from '@/lib/portfolio/deriveAllocations'
import { buildPortfolioKey } from '@/lib/portfolio/portfolio-key'

export const dynamic = 'force-dynamic'

const updateDailySignalSchema = z.object({
  signal: z.string().optional(),
  primaryAsset: z.enum(portfolioAssets).optional(),
  secondaryAsset: z.enum(portfolioAssets).optional(),
  tertiaryAsset: z.enum(portfolioAssets).optional(),
  riskProfile: z.enum(['AGGRESSIVE', 'SEMI', 'CONSERVATIVE']).optional(),
  executiveSummary: z.string().optional(),
  associatedData: z.string().optional(),
})

// PUT /api/admin/portfolio-daily-signals/[id] - Update daily update
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = updateDailySignalSchema.parse(body)

    // Verify update exists
    const existingSignal = await prisma.portfolioDailySignal.findUnique({
      where: { id: params.id },
    })

    if (!existingSignal) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const isMemecoins = existingSignal.category === 'memecoins'
    let signalValue: string

    if (isMemecoins) {
      if (!data.signal || !data.signal.trim()) {
        return NextResponse.json({
          error: 'Invalid input',
          details: [
            {
              path: ['signal'],
              message: 'Signal text is required for memecoins updates',
            },
          ],
        }, { status: 400 })
      }
      signalValue = data.signal.trim()
    } else {
      if (!data.primaryAsset || !data.secondaryAsset || !data.tertiaryAsset) {
        return NextResponse.json({
          error: 'Invalid input',
          details: [
            {
              path: ['primaryAsset'],
              message: 'Primary, secondary, and tertiary assets are required',
            },
          ],
        }, { status: 400 })
      }
      signalValue = formatAllocationSignal(data.primaryAsset, data.secondaryAsset, data.tertiaryAsset)
    }

    // Update update
    const updatedSignal = await prisma.portfolioDailySignal.update({
      where: { id: params.id },
      data: {
        signal: signalValue,
        ...(data.riskProfile && { riskProfile: data.riskProfile }),
        ...(data.executiveSummary !== undefined && { 
          executiveSummary: data.executiveSummary.trim() || null 
        }),
        ...(data.associatedData !== undefined && { 
          associatedData: data.associatedData.trim() || null 
        }),
      },
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

    logger.info('Daily update updated', {
      signalId: updatedSignal.id,
      tier: updatedSignal.tier,
      category: updatedSignal.category,
      updatedBy: session.user.id,
    })

    const portfolioKey = buildPortfolioKey({
      tier: updatedSignal.tier,
      category: updatedSignal.category,
      riskProfile: updatedSignal.riskProfile
    })
    const publishedAt = updatedSignal.publishedAt
    const asOfDate = new Date(Date.UTC(
      publishedAt.getUTCFullYear(),
      publishedAt.getUTCMonth(),
      publishedAt.getUTCDate()
    ))

    const allocationAssets = parseAllocationAssets(updatedSignal.signal)
    if (allocationAssets) {
      try {
        const allocations = deriveAllocations(updatedSignal.riskProfile, {
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
      } catch (error) {
        logger.error('Failed to derive allocations for updated signal', error instanceof Error ? error : new Error(String(error)), {
          signalId: updatedSignal.id,
          tier: updatedSignal.tier,
          category: updatedSignal.category
        })
      }
    } else {
      logger.warn('Allocation assets missing for updated signal; skipping model recompute mark', {
        signalId: updatedSignal.id,
        tier: updatedSignal.tier,
        category: updatedSignal.category
      })
    }

    // Send email notifications without blocking the response
    logger.info('Triggering email sending for updated signal', {
      signalId: updatedSignal.id,
      tier: updatedSignal.tier,
      category: updatedSignal.category,
    })
    
    void sendSignalEmails(updatedSignal.id).then(() => {
      logger.info('Email sending completed successfully', {
        signalId: updatedSignal.id,
        tier: updatedSignal.tier,
        category: updatedSignal.category,
      })
    }).catch((error) => {
      logger.error('Failed to send update emails', error instanceof Error ? error : new Error(String(error)), {
        signalId: updatedSignal.id,
        tier: updatedSignal.tier,
        category: updatedSignal.category,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      console.error('[PUT] Failed to send update emails:', error)
    })

    return NextResponse.json(updatedSignal)
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
    logger.error('Error updating daily update', error instanceof Error ? error : new Error(String(error)), {
      signalId: params.id,
    })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage 
    }, { status: 500 })
  }
}

