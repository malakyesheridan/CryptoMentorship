import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { runPortfolioRoiJob } from '@/lib/jobs/portfolio-roi'

const BackfillSchema = z.object({
  portfolioKey: z.string().min(1),
  days: z.number().int().min(1).max(3650)
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = BackfillSchema.parse(body)

    const portfolioKey = data.portfolioKey.trim().toLowerCase()
    const snapshot = await prisma.roiDashboardSnapshot.findUnique({
      where: {
        scope_portfolioKey: {
          scope: 'PORTFOLIO',
          portfolioKey
        }
      }
    })

    if (!snapshot) {
      return NextResponse.json({ error: 'Portfolio snapshot not found.' }, { status: 404 })
    }

    const endDate = new Date()
    const startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()))
    startDate.setUTCDate(startDate.getUTCDate() - data.days)

    const result = await runPortfolioRoiJob({
      portfolioKey,
      forceStartDate: startDate,
      forceEndDate: endDate,
      includeClean: true,
      trigger: 'admin-backfill',
      requestedBy: user.id
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to backfill ROI.' }, { status: 500 })
  }
}
