import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { ModerationAction, ModerationStatus } from '@prisma/client'
import { z } from 'zod'

const reviewSchema = z.object({
  status: z.nativeEnum(ModerationStatus),
  actionTaken: z.nativeEnum(ModerationAction).optional(),
  notes: z.string().max(2000).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reportId } = await params
    const json = await request.json()
    const data = reviewSchema.parse(json)

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: data.status,
        actionTaken: data.actionTaken,
        notes: data.notes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    console.error('Error reviewing report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
