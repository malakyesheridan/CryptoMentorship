import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const SeriesTypeSchema = z.enum(['MODEL', 'BTC', 'ETH'])

const SeriesPointSchema = z.object({
  seriesType: SeriesTypeSchema,
  date: z.string().min(1),
  value: z.number().positive()
})

export async function GET(request: Request) {
  try {
    await requireRoleAPI(['admin'])
    const { searchParams } = new URL(request.url)
    const seriesType = SeriesTypeSchema.parse(searchParams.get('seriesType'))
    const pageParam = Number(searchParams.get('page') ?? 1)
    const pageSizeParam = Number(searchParams.get('pageSize') ?? 50)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const pageSize = Number.isFinite(pageSizeParam) ? Math.min(200, Math.max(10, pageSizeParam)) : 50
    const skip = (page - 1) * pageSize

    const [total, rows] = await Promise.all([
      prisma.performanceSeries.count({ where: { seriesType, portfolioKey: 'dashboard' } }),
      prisma.performanceSeries.findMany({
        where: { seriesType, portfolioKey: 'dashboard' },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize
      })
    ])

    return NextResponse.json({
      seriesType,
      page,
      pageSize,
      total,
      rows: rows.map((row) => ({
        id: row.id,
        date: row.date.toISOString().split('T')[0],
        value: toNum(row.value)
      }))
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid series type.' }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load series.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = SeriesPointSchema.parse(body)
    const date = new Date(`${data.date}T00:00:00.000Z`)

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
    }

    const record = await prisma.performanceSeries.upsert({
      where: {
        seriesType_date_portfolioKey: {
          seriesType: data.seriesType,
          date,
          portfolioKey: 'dashboard'
        }
      },
      update: { value: data.value },
      create: {
        seriesType: data.seriesType,
        date,
        value: data.value,
        portfolioKey: 'dashboard'
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      id: record.id,
      date: record.date.toISOString().split('T')[0],
      value: toNum(record.value)
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to save series point.' }, { status: 500 })
  }
}
