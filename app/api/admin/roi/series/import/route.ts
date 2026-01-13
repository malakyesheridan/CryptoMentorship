import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { parseSeriesCsv, invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const ImportSchema = z.object({
  seriesType: z.enum(['MODEL', 'BTC', 'ETH']),
  csvText: z.string().min(1),
  replaceExisting: z.boolean().optional()
})

export async function POST(request: Request) {
  try {
    await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = ImportSchema.parse(body)
    const parsed = parseSeriesCsv(data.csvText)

    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: 'CSV validation failed', details: parsed.errors }, { status: 400 })
    }

    if (data.replaceExisting) {
      await prisma.performanceSeries.deleteMany({
        where: { seriesType: data.seriesType, portfolioKey: 'dashboard' }
      })
    }

    await prisma.$transaction(
      parsed.points.map((point) =>
        prisma.performanceSeries.upsert({
          where: {
            seriesType_date_portfolioKey: {
              seriesType: data.seriesType,
              date: new Date(`${point.date}T00:00:00.000Z`),
              portfolioKey: 'dashboard'
            }
          },
          update: { value: point.value },
          create: {
            seriesType: data.seriesType,
            date: new Date(`${point.date}T00:00:00.000Z`),
            value: point.value,
            portfolioKey: 'dashboard'
          }
        })
      )
    )

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      success: true,
      seriesType: data.seriesType,
      imported: parsed.points.length,
      replaced: !!data.replaceExisting
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to import series.' }, { status: 500 })
  }
}
