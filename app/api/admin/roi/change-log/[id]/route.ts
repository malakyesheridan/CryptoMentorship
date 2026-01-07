import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const UpdateSchema = z.object({
  date: z.string().optional(),
  title: z.string().min(1).max(120).optional(),
  summary: z.string().min(1).max(300).optional(),
  linkUrl: z.string().url().nullable().optional()
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = UpdateSchema.parse(body)

    const existing = await prisma.changeLogEvent.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Change log event not found.' }, { status: 404 })
    }

    let date = existing.date
    if (data.date) {
      const parsedDate = new Date(`${data.date}T00:00:00.000Z`)
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
      }
      date = parsedDate
    }

    const updated = await prisma.changeLogEvent.update({
      where: { id: existing.id },
      data: {
        date,
        title: data.title ?? existing.title,
        summary: data.summary ?? existing.summary,
        linkUrl: data.linkUrl ?? existing.linkUrl
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      id: updated.id,
      date: updated.date.toISOString().split('T')[0],
      title: updated.title,
      summary: updated.summary,
      linkUrl: updated.linkUrl
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to update change log event.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleAPI(['admin'])
    const existing = await prisma.changeLogEvent.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Change log event not found.' }, { status: 404 })
    }

    await prisma.changeLogEvent.delete({ where: { id: existing.id } })
    await invalidateRoiDashboardCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to delete change log event.' }, { status: 500 })
  }
}
