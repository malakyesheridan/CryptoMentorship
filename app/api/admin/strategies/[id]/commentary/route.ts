import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentarySchema = z.object({
  commentaryText: z.string().min(1).max(5000),
  notify: z.boolean().optional().default(false),
})

// POST /api/admin/strategies/[id]/commentary - Push manual commentary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { commentaryText, notify } = commentarySchema.parse(body)

    // Verify strategy exists
    const strategy = await prisma.strategy.findUnique({ where: { id } })
    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const update = await prisma.strategyUpdate.create({
      data: {
        strategyId: id,
        date: new Date(),
        updateType: 'commentary',
        commentaryText,
        notify,
      },
    })

    // Log audit entry
    await prisma.audit.create({
      data: {
        actorId: session.user.id,
        action: 'strategy_commentary_created',
        subjectType: 'strategy',
        subjectId: id,
        metadata: JSON.stringify({
          updateId: update.id,
          notify,
          textLength: commentaryText.length,
        }),
      },
    })

    return NextResponse.json(update)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    console.error('Error creating commentary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
