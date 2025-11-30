import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sendSignalEmails } from '@/lib/jobs/send-signal-emails'

export const dynamic = 'force-dynamic'

const updateDailySignalSchema = z.object({
  signal: z.string().min(1).max(500).optional(),
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

    // Update update
    const updatedSignal = await prisma.portfolioDailySignal.update({
      where: { id: params.id },
      data: {
        ...(data.signal !== undefined && { signal: data.signal.trim() }),
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

    // Send email notifications asynchronously (fire-and-forget)
    // Send the exact updated signal to eligible users
    logger.info('Triggering email sending for updated signal', {
      signalId: updatedSignal.id,
      tier: updatedSignal.tier,
      category: updatedSignal.category,
    })
    sendSignalEmails(updatedSignal.id).catch((error) => {
      logger.error('Failed to send update emails', error instanceof Error ? error : new Error(String(error)), {
        signalId: updatedSignal.id,
        tier: updatedSignal.tier,
        category: updatedSignal.category,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
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

