import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { toNum } from '@/lib/num'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const UpdateSchema = z.object({
  date: z.string().optional(),
  value: z.number().positive().optional()
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = UpdateSchema.parse(body)
    const existing = await prisma.performanceSeries.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Series point not found.' }, { status: 404 })
    }

    let date = existing.date
    if (data.date) {
      const parsedDate = new Date(`${data.date}T00:00:00.000Z`)
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
      }

      const conflict = await prisma.performanceSeries.findFirst({
        where: {
          seriesType: existing.seriesType,
          date: parsedDate,
          portfolioKey: 'dashboard',
          NOT: { id: existing.id }
        }
      })

      if (conflict) {
        return NextResponse.json(
          { error: 'Another series point already exists for that date.' },
          { status: 409 }
        )
      }
      date = parsedDate
    }

    const updated = await prisma.performanceSeries.update({
      where: { id: existing.id },
      data: {
        date,
        value: data.value ?? existing.value
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      id: updated.id,
      date: updated.date.toISOString().split('T')[0],
      value: toNum(updated.value)
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to update series point.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleAPI(['admin'])
    const existing = await prisma.performanceSeries.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Series point not found.' }, { status: 404 })
    }

    await prisma.performanceSeries.delete({ where: { id: existing.id } })
    await invalidateRoiDashboardCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to delete series point.' }, { status: 500 })
  }
}
