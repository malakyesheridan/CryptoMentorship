import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const AllocationSchema = z.object({
  asOfDate: z.string().min(1),
  cashWeight: z.number().min(0).max(1),
  items: z.array(
    z.object({
      asset: z.string().min(1),
      weight: z.number().min(0).max(1)
    })
  )
})

const WEIGHT_TOLERANCE = 0.005

export async function GET() {
  try {
    await requireRoleAPI(['admin'])
    const allocation = await prisma.allocationSnapshot.findFirst({
      where: { portfolioKey: 'dashboard' },
      orderBy: { asOfDate: 'desc' }
    })

    if (!allocation) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      asOfDate: allocation.asOfDate.toISOString().split('T')[0],
      cashWeight: Number(allocation.cashWeight),
      items: allocation.items
    })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load allocation.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = AllocationSchema.parse(body)
    const asOfDate = new Date(`${data.asOfDate}T00:00:00.000Z`)

    if (Number.isNaN(asOfDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
    }

    const totalWeight = data.items.reduce((sum, item) => sum + item.weight, data.cashWeight)
    if (Math.abs(totalWeight - 1) > WEIGHT_TOLERANCE) {
      return NextResponse.json(
        { error: 'Weights must sum to 1.0 within 0.5% tolerance.' },
        { status: 400 }
      )
    }

    const allocation = await prisma.allocationSnapshot.upsert({
      where: {
        portfolioKey_asOfDate: {
          portfolioKey: 'dashboard',
          asOfDate
        }
      },
      update: {
        cashWeight: data.cashWeight,
        items: data.items,
        updatedByUserId: user.id
      },
      create: {
        portfolioKey: 'dashboard',
        asOfDate,
        cashWeight: data.cashWeight,
        items: data.items,
        updatedByUserId: user.id
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      asOfDate: allocation.asOfDate.toISOString().split('T')[0],
      cashWeight: Number(allocation.cashWeight),
      items: allocation.items
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to save allocation.' }, { status: 500 })
  }
}
