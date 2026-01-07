import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRoleAPI } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { invalidateRoiDashboardCache } from '@/lib/roi-dashboard'

const ChangeLogSchema = z.object({
  date: z.string().min(1),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(300),
  linkUrl: z.string().url().optional().nullable()
})

export async function GET(request: Request) {
  try {
    await requireRoleAPI(['admin'])
    const { searchParams } = new URL(request.url)
    const take = Math.min(100, Math.max(5, Number(searchParams.get('take') ?? 50)))

    const events = await prisma.changeLogEvent.findMany({
      orderBy: { date: 'desc' },
      take
    })

    return NextResponse.json(
      events.map((event) => ({
        id: event.id,
        date: event.date.toISOString().split('T')[0],
        title: event.title,
        summary: event.summary,
        linkUrl: event.linkUrl
      }))
    )
  } catch (error: any) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to load change log.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireRoleAPI(['admin'])
    const body = await request.json()
    const data = ChangeLogSchema.parse(body)
    const date = new Date(`${data.date}T00:00:00.000Z`)

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
    }

    const event = await prisma.changeLogEvent.create({
      data: {
        date,
        title: data.title,
        summary: data.summary,
        linkUrl: data.linkUrl ?? null,
        createdByUserId: user.id
      }
    })

    await invalidateRoiDashboardCache()

    return NextResponse.json({
      id: event.id,
      date: event.date.toISOString().split('T')[0],
      title: event.title,
      summary: event.summary,
      linkUrl: event.linkUrl
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Failed to create change log event.' }, { status: 500 })
  }
}
